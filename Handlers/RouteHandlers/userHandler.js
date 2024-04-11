//dependencies
const data = require('./../../lib/data');
const{hash} = require('../../helpers/utilities');
const{parseJSON} = require('../../helpers/utilities');
const { todo } = require('node:test');
const tokenHandler = require('./tokenHandler')

//module scaffolding
const handler = {};

handler.userHandler = (requestProperties, callback) => {
  const acceptedMethods = ['get', 'post', 'put', 'delete'];
  if (acceptedMethods.indexOf(requestProperties.method) > -1) {
    handler._users[requestProperties.method](requestProperties, callback);
  } else {
    callback(405)
  }
}

handler._users = {};


handler._users.get = (requestProperties,callback) => {
  //check if the phone number is valid
  const phoneNum = typeof (requestProperties.queryStringObject.phoneNum) === 'string' && requestProperties.queryStringObject
  .phoneNum.trim().length === 11 ? requestProperties.queryStringObject.phoneNum : false;

  if(phoneNum) {
    //authentication
    let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;

    tokenHandler._token.verify(token, phoneNum, (tokenId) => {
      if(tokenId) {
        //look up the user
        data.read('users', phoneNum, (err, u) => {
          const user = {...parseJSON(u)}
          if(!err && user) {
            delete user.password;
            callback(200, user);
          } else {
            callback(404, {
              error : 'Requested user was not found!'
            });
          }
        })
      } else {
        callback(403, {
          error: "Authentication failure"
        })
      }
    })
  } else {
    callback(404, {
      error: 'requested user was not found'
    });
  }
};

handler._users.post = (requestProperties,callback) => {
  const firstName = typeof(requestProperties.body.firstName) === 'string' && requestProperties.body
  .firstName.trim().length > 0 ? requestProperties.body.firstName : false;

  const lastName = typeof(requestProperties.body.lastName) === 'string' && requestProperties.body
  .lastName.trim().length > 0 ? requestProperties.body.lastName : false;

  const phoneNum = typeof(requestProperties.body.phoneNum) === 'string' && requestProperties.body
  .phoneNum.trim().length === 11 ? requestProperties.body.phoneNum : false;
  
  const password = typeof(requestProperties.body.password) === 'string' && requestProperties.body
  .password.trim().length > 0 ? requestProperties.body.password : false;

  const tosAgreement = typeof(requestProperties.body.tosAgreement) === 'boolean' ? requestProperties.body.tosAgreement : false;


  if(firstName && lastName && phoneNum && tosAgreement && password) {
    // make sure that the user doesn't already exist
    data.read('users', phoneNum, (err1) => {
      if (err1) {
        let userObject = {
          firstName,
          lastName,
          phoneNum,
          password: hash(password),
          tosAgreement
        };
        // store the data
        data.create('users', phoneNum, userObject, (err2)=> {
          if(!err2) {
            callback(200, {
              message: 'User was created successfully'
            });
          } else {
            console.log(err2);
            callback(500, {error: "Couldn't create user"});
          }
        })
      } else {
        callback(500, {
          error : 'There was a problem in server side!'
        })
      }
    })
  } else {
    callback(400, {
      error: ' You have a problem in your request'
    });
  }

};

handler._users.put = (requestProperties,callback) => {
  const phoneNum = typeof (requestProperties.body.phoneNum) === 'string' && requestProperties.body
  .phoneNum.trim().length === 11 ? requestProperties.body.phoneNum : false;

  const firstName = typeof(requestProperties.body.firstName) === 'string' && requestProperties.body
  .firstName.trim().length > 0 ? requestProperties.body.firstName : false;

  const lastName = typeof(requestProperties.body.lastName) === 'string' && requestProperties.body
  .lastName.trim().length > 0 ? requestProperties.body.lastName : false;
  
  const password = typeof(requestProperties.body.password) === 'string' && requestProperties.body
  .password.trim().length > 0 ? requestProperties.body.password : false;

  if(phoneNum) {
    if(firstName||lastName||password) {
      //authentication
    let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;

    tokenHandler._token.verify(token, phoneNum, (tokenId) => {
      if(tokenId) {
        //lookup the user
      data.read('users', phoneNum, (err1, uData) => {
        const userData = {...parseJSON(uData)};

        if(!err1 && userData) {
          if(firstName) {
            userData.firstName = firstName;
          }
          if(lastName) {
            userData.lastName = lastName;
          }
          if(password) {
            userData.password = hash(password);
          }

          //store to database
          data.update('users', phoneNum, userData, (err2) => {
            if(!err2) {
              callback(200, {
                message: 'User was updated successfully!'
              })
            } else {
              callback(500, {
                error: 'There was a problem in the server side!'
              });
            }
          })
        } else {
          callback(400, {
            error: 'The requested user was not found!'
          })
        }
      })
      } else {
        callback(403, {
          error: "Authentication failure"
        })
      }
    })    
    } else {
      callback(400, {
        error: 'You have given nothing to update'
      });
    }
  } else {
    callback(400, {
      error: 'Please provide a valid phone number and try again!'
    });
  }
};

handler._users.delete = (requestProperties,callback) => {
  //check if the phone number is valid
  const phoneNum = typeof (requestProperties.queryStringObject.phoneNum) === 'string' && requestProperties.queryStringObject
  .phoneNum.trim().length === 11 ? requestProperties.queryStringObject.phoneNum : false;

  if(phoneNum) {
    //authentication
    let token = typeof(requestProperties.headersObject.token) === 'string' ? requestProperties.headersObject.token : false;

    tokenHandler._token.verify(token, phoneNum, (tokenId) => {
      if(tokenId) {
        //lookup for the user
    data.read('users', phoneNum, (err1, userData) => {
      if(!err1 && userData) {
        data.delete ('users', phoneNum, (err2) => {
          if(!err2) {
            callback(200, {
              message: 'User was successfully deleted!',
            });
          } else {
            callback(500, {
              error: "There was a server side error!"
            });
          }
        })
      } else {
        callback(500, {
          error: "there was a problem in the server side!"
        })
      }
    })
      } else {
        callback(403, {
          error: "Authentication failure"
        })
      }
    })
  } else {
    callback(400, {
      error: 'There was a problem inyour request'
    });
  }
};


module.exports = handler;