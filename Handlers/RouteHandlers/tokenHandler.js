//dependencies
const data = require('./../../lib/data');
const{hash} = require('../../helpers/utilities');
const{createRandomString} = require('../../helpers/utilities');
const{parseJSON} = require('../../helpers/utilities');


//module scaffolding
const handler = {};

handler.tokenHandler = (requestProperties, callback) => {
  const acceptedMethods = ['get', 'post', 'put', 'delete'];
  if (acceptedMethods.indexOf(requestProperties.method) > -1) {
    handler._token[requestProperties.method](requestProperties, callback);
  } else {
    callback(405)
  }
}

handler._token = {};


handler._token.get = (requestProperties,callback) => {
  //check if the token id is valid
  const id = typeof (requestProperties.queryStringObject.id) === 'string' && requestProperties.queryStringObject
  .id.trim().length === 20 ? requestProperties.queryStringObject.id : false;

  if(id) {
    data.read('tokens', id, (err, tData) => {
      const token = {...parseJSON(tData)}
      if(!err && token) {
        callback(200, token);
      } else {
        callback(404, {
          error : 'Requested token was not found!'
        });
      }
    })
  } else {
    callback(404, {
      error: 'requested token was not found'
    });
  }
};

handler._token.post = (requestProperties,callback) => {
  const phoneNum = typeof(requestProperties.body.phoneNum) === 'string' && requestProperties.body
  .phoneNum.trim().length === 11 ? requestProperties.body.phoneNum : false;
  
  const password = typeof(requestProperties.body.password) === 'string' && requestProperties.body
  .password.trim().length > 0 ? requestProperties.body.password : false;

  if(phoneNum && password) {
    data.read('users', phoneNum, (err1, uData) => {
      const userData = {...parseJSON(uData)};
      const hashedPassword = hash(password);
      if (hashedPassword === userData.password) {
        let tokenId = createRandomString(20);
        let expires = Date.now() + 60*60*1000;
        let tokenObject = {
          phoneNum,
          'id': tokenId,
          expires
        };

        //store token in the database
        data.create('tokens', tokenId, tokenObject, (err)=>{
          if(!err) {
            callback(200, tokenObject);
          } else {
            callback(500, {
              error: "There was a problem in the server side!"
            })
          }
        })
      } else {
        callback(400, {
          error: "Password is not valid!"
        })
      }
    })
  } else {
    callback(400, {
      error: "you have a problem in your request!"
    });
  }
};

handler._token.put = (requestProperties,callback) => {
  const id = typeof (requestProperties.body.id) === 'string' && requestProperties.body
  .id.trim().length === 20 ? requestProperties.body.id : false;

  const extend = typeof (requestProperties.body.extend) === 'boolean' && requestProperties.body
  .extend === true ? true : false;

  if(id && extend) {
    data.read('tokens', id, (err, tData) => {
      const tokenData = {...parseJSON(tData)};
      if(tokenData.expires > Date.now()) {
        tokenData.expires = Date.now() + 60*60*1000;

        
        //store the updated token
        data.update('tokens', id, tokenData, (err2) => {
          if(!err2) {
            callback(200, {
              message: `token updated. ${tokenData.expires-Date.now()} ms remaining!`
            });
          } else {
            callback(500, {
              error: "There was a server side error!"
            })
          }
        })
      } else {
        expired = Date.now() - tokenData.expires;
        callback (400, {
          error: "Token already expired",
          now: Date.now(),
          expired: `expired ${expired} ms ago!`
        })
      }
    })
  } else {
    callback(400, {
      error: "There was a problem in your request"
    });
  }

};

handler._token.delete = (requestProperties,callback) => {
   //check if the phone number is valid
   const id = typeof (requestProperties.queryStringObject.id) === 'string' && requestProperties.queryStringObject
   .id.trim().length === 20 ? requestProperties.queryStringObject.id : false;
 
   if(id) {
     //lookup for the user
     data.read('tokens', id, (err1, tokenData) => {
       if(!err1 && tokenData) {
         data.delete ('tokens', id, (err2) => {
           if(!err2) {
             callback(200, {
               message: 'Token was successfully deleted!',
             });
           } else {
             callback(500, {
               error: "There was a server side error!"
             });
           }
         })
       } else {
         callback(500, {
           error: "there was a problem in the server side or token doesn't exist!"
         })
       }
     })
   } else {
     callback(400, {
       error: 'There was a problem in your request'
     });
   }
};


handler._token.verify = (id, phoneNum, callback) => {
  data.read('tokens', id, (err, tokenData) => {
    if(!err && tokenData) {
      if(parseJSON(tokenData).phoneNum === phoneNum && parseJSON(tokenData).expires > Date.now()) {
        callback(true);
      } else callback(false);
    } else {
      callback(false);
    }
  })
}

module.exports = handler;