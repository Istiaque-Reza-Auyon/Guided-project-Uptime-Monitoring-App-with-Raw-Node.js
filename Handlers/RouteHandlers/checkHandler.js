//dependencies
const data = require('./../../lib/data');
const{createRandomString} = require('../../helpers/utilities');
const{parseJSON} = require('../../helpers/utilities');
const tokenHandler = require('./tokenHandler');
const {maxChecks} = require('../../helpers/environments');

//module scaffolding
const handler = {};

handler.checkHandler = (requestProperties, callback) => {
  const acceptedMethods = ['get', 'post', 'put', 'delete'];
  if (acceptedMethods.indexOf(requestProperties.method) > -1) {
    handler._check[requestProperties.method](requestProperties, callback);
  } else {
    callback(405)
  }
}

handler._check = {};


handler._check.get = (requestProperties,callback) => {
  const id = typeof (requestProperties.queryStringObject.id) === 'string' && requestProperties.queryStringObject
  .id.trim().length === 20 ? requestProperties.queryStringObject.id : false;

  if(id) {
    // lookup the check
    data.read('checks', id, (err, checkData) => {
      if(!err && checkData) {
        let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;
        tokenHandler._token.verify(token, parseJSON(checkData).userPhone, (tokenIsValid) =>{
          if(tokenIsValid) {
            callback(200, parseJSON(checkData));
          } else {
            callback(403, {
              error: 'Authentication problem!'
            })
          }
        });
      } else {
        callback(500, {
          error: 'You have a problem in your request'
        })
      }
    })
  } else {
    callback(400, {
      error: 'You have a problem in your request'
    })
  }
};

handler._check.post = (requestProperties,callback) => {
  // validate inputs
  let protocol = typeof(requestProperties.body.protocol) === 'string' && ['http','https'].includes(requestProperties.body.protocol) ? requestProperties.body.protocol : false;

  let url = typeof(requestProperties.body.url) === 'string' && requestProperties.body.url.trim().length > 0 ? requestProperties.body.url : false;

  let method = typeof(requestProperties.body.method) === 'string' && ['get','post', 'put', 'delete'].includes(requestProperties.body.method) ? requestProperties.body.method : false;

  let successCodes = typeof(requestProperties.body.successCodes) === 'object' && requestProperties.body.successCodes instanceof Array ? requestProperties.body.successCodes : false;

  let timeoutSeconds = typeof(requestProperties.body.timeoutSeconds) === 'number' && requestProperties.body.timeoutSeconds % 1 === 0 && requestProperties.body.timeoutSeconds > 1 && requestProperties.body.timeoutSeconds <= 5 ? requestProperties.body.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds) {
    let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;
    
    //lookup the user phone by reading the token
    data.read('tokens', token, (err1, tokenData) => {
      if(!err1 && tokenData) {
        let userPhone = parseJSON(tokenData).phoneNum;
        //lookup the user data
        data.read('users', userPhone, (err2, userData) => {
          if (!err2 && userData) {
            tokenHandler._token.verify(token, userPhone, (tokenIsValid) =>{
              if(tokenIsValid) {
                let userObject = parseJSON(userData);
                let userChecks = typeof userObject.checks === 'object' && userObject.checks instanceof Array ? userObject.checks : [];

                if(userChecks.length < maxChecks) {
                  const checkId = createRandomString(20);
                  const checkObject = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds
                  };
                  //save the object
                  data.create('checks', checkId, checkObject, (err3) => {
                    if(!err3) {
                      // add check id users object
                      userObject.checks = userChecks;
                      userObject.checks.push(checkId);

                      //save the new user data
                      data.update('users', userPhone, userObject, (err4) => {
                        if(!err4) {
                          callback(200, checkObject);
                        } else {
                          callback(500, {
                            error: " There was a server side error"
                          })
                        }
                      })
                    } else {
                      callback(500, {
                        error: "There was a problem in the server side"
                      });
                    }
                  });
                } else {
                  callback(401, "User has already reached maxcheck limit!")
                }
              } else {
                callback(403, {
                  error: 'Authentication problem'
                })
              }
            })
          } else {
            callback(403, {
              error: "User not found!"
            });
          }
        })
      } else {
        callback(403, {
          error: 'Authentication error!'
        })
      }
    })
  } else {
    callback(400, {
      error: 'You have a problem in your request'
    });
  }
};

handler._check.put = (requestProperties,callback) => {
  const id = typeof (requestProperties.body.id) === 'string' && requestProperties.body
  .id.trim().length === 20 ? requestProperties.body.id : false;

  let protocol = typeof(requestProperties.body.protocol) === 'string' && ['http','https'].includes(requestProperties.body.protocol) ? requestProperties.body.protocol : false;

  let url = typeof(requestProperties.body.url) === 'string' && requestProperties.body.url.trim().length > 0 ? requestProperties.body.url : false;

  let method = typeof(requestProperties.body.method) === 'string' && ['get','post', 'put', 'delete'].includes(requestProperties.body.method) ? requestProperties.body.method : false;

  let successCodes = typeof(requestProperties.body.successCodes) === 'object' && requestProperties.body.successCodes instanceof Array ? requestProperties.body.successCodes : false;

  let timeoutSeconds = typeof(requestProperties.body.timeoutSeconds) === 'number' && requestProperties.body.timeoutSeconds % 1 === 0 && requestProperties.body.timeoutSeconds > 1 && requestProperties.body.timeoutSeconds <= 5 ? requestProperties.body.timeoutSeconds : false;

  if(id) {
    if(protocol || url || method || successCodes || timeoutSeconds) {
      data.read('checks', id, (err1, checkData) => {
        if(!err1 && checkData) {
          let checkObject = parseJSON(checkData);
          let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;
          
          tokenHandler._token.verify(token, checkObject.userPhone, (tokenIsValid) =>{
            if(tokenIsValid) { 
              if (protocol) checkObject.protocol = protocol;
              if (url) checkObject.url = url;
              if (method) checkObject.method = method;
              if (successCodes) checkObject.successCodes = successCodes;
              if (timeoutSeconds) checkObject.timeoutSeconds = timeoutSeconds;

              //store the checkObject
              data.update('checks', id, checkObject, (err2) => {
                if (!err2) {
                  callback(200);
                } else {
                  callback(500, {
                    error: "There was a error in the server side!"
                  })
                }
              })
            } else {
              callback(403, {
                error: " Authentication error!"
              })
            }
          });
        } else {
          callback(500, {
            error: "There was a problem in the server side!"
          })
        }
      })
    }
  } else {
    callback(400, {
      error: "You have a problem in your request"
    })
  }
};

handler._check.delete = (requestProperties,callback) => {
   const id = typeof (requestProperties.queryStringObject.id) === 'string' && requestProperties.queryStringObject
  .id.trim().length === 20 ? requestProperties.queryStringObject.id : false;

  if(id) {
    // lookup the check
    data.read('checks', id, (err, checkData) => {
      if(!err && checkData) {
        let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;
        tokenHandler._token.verify(token, parseJSON(checkData).userPhone, (tokenIsValid) =>{
          if(tokenIsValid) {
            data.delete('checks', id, (err1) => {
              if(!err1) {
                data.read('users', parseJSON(checkData).userPhone, (err2, userData) => {
                  if(!err2 && userData) {
                    let userObject = parseJSON(userData);
                    let userChecks = typeof userObject.checks === 'object' && userObject.checks instanceof Array ? userObject.checks : [];

                    //remove the deleted check id from users list of checks
                    let checkPos = userChecks.indexOf(id);
                    if(checkPos > -1) {
                      userChecks.splice(checkPos, 1);
                      // resave the user data
                      userObject.checks =  userChecks;
                      data.update('users',userObject.phoneNum, userObject, (err3) => {
                        if(!err3) {
                          callback(200, {
                            message: "Task complete!"
                          })
                        } else {
                          callback(500, {
                            error: "There was a problem in the server side!"
                          })
                        }
                      })
                    } else {
                      callback(500, {
                        error: "The check id wasn't found in user check list!"
                      })
                    }
                  } else {
                    callback(500, {
                      error: "There was a problem in the server side!"
                    })
                  }
                })
              } else {
                callback(500, {
                  error: "There was a server side error!"
                })
              }
            });
          } else {
            callback(403, {
              error: 'Authentication problem!'
            })
          }
        });
      } else {
        callback(500, {
          error: 'You have a problem in your request'
        })
      }
    })
  } else {
    callback(400, {
      error: 'You have a problem in your request'
    })
  }
};


module.exports = handler;