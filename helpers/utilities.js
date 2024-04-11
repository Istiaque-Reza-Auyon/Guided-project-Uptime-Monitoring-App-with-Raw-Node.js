//dependencies
const crypto = require('crypto');
const environments = require('./environments')

//scaffolding
const utilities = {};

//parse JSON string to Object
utilities.parseJSON = (jsonString) => {
  let output

  try {
    output = JSON.parse(jsonString);
  } catch {
    output = {}
  }
  return output;
}

// hash string
utilities.hash = (str) => {
  if (typeof str === 'string' && str.length>0) {
    let hash = crypto
                     .createHmac('sha256', environments.secretKey)
                     .update(str)
                     .digest('hex');
    return hash;                 
  } else {
    return false;
  }
}


//create random string
utilities.createRandomString = (strLength) => {
  let length= strLength;
  length = typeof(strLength) === 'number' && strLength > 0 ? strLength: false;

  if(length) {
    let possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let output = '';
    for(let i=1; i<= length; i++) {
      let randomChars = possibleChars.charAt(Math.round(Math.random()*possibleChars.length));
      output += randomChars;
    }
    return output;
  } else {
    return false;
  }
}

module.exports = utilities;