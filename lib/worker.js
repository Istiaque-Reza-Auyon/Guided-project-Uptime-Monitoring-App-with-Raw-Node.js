//import necessary modules
const http = require('http');
const https = require('https');
const data = require('./data');
const url = require('url');
const {parseJSON} = require('../helpers/utilities');
const{sendTwilioSms} = require('../helpers/notifications');

// USE SCAFFOLDING

const workers = {};

//timer toexecute the worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllchecks();
  }, 5000);
}

// lookup all the checks from database
workers.gatherAllchecks = () => {
  // get all the checks
  //get all the checks
  data.list('checks', (err1, checks) =>  {
    if(!err1 && checks && checks.length > 0) {
      checks.forEach((check) => {
        //read the checkData
        data.read('checks', check, (err2, originalCheckData) => {
          if(!err2 && originalCheckData) {
            // pass the data to the check validator
            workers.validateCheckData(parseJSON(originalCheckData));
          } else {
            console.log('Error: reading one of the checks data!');
          }
        })
      })
    } else {
      console.log('Error: could not find any checks to process!');
    }
  })
}

//validate individual check data
workers.validateCheckData = (originalData) => {
  let originalCheckData = originalData;
  if(originalCheckData && originalCheckData.id) {
    originalCheckData.state =typeof(originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';

    originalCheckData.lastChecked = typeof originalCheckData.lastChecked === 'number' && originalCheckData.lastChecked>0 ? originalCheckData.lastChecked : false;

    // pass to the  next process
    workers.performCheck(originalCheckData);
  } else {
    console.log('Error: Check was invalid or not properly formatted');
  }
}


//perform check
workers.performCheck = (originalCheckData) => {
  //prepare the initial checkOutcome
  let checkOutcome = {
    'error': false,
    'responseCode': false
  };
  //mark the outcome has not been sent yet
  let outcomeSent = false;

  //parse the hostName & full URL from original data 
  let parseURL = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  const hostname = parseURL.hostname;
  const path = parseURL.path;

  //construct the request
  const requestDetails = {
    'protocol': originalCheckData.protocol + ':',
    hostname,
    'method': originalCheckData.method.toUpperCase(),
    path,
    'timeout': originalCheckData.timeoutSeconds * 1000
  };

  //req in http or https?
  const protocolToUse = originalCheckData.protocol === 'http' ? http : https;

  let req = protocolToUse.request(requestDetails, (res) => {
    //grab the status of the response
    const status = res.statusCode;

    //update the check outcome and pass to the next process 
    checkOutcome.responseCode = status;
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //req end

  req.on('error',(e) => {
    checkOutcome = {
      error: true,
      value:e
    }
    //update the check outcome and pass to the next process 
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout', (e) => {
    checkOutcome = {
      error: true,
      value: 'timeout'
    }
    //update the check outcome and pass to the next process 
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
}


//save outcome in database and send to next process
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  //check if check outcome is up or down
  let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

  //Decide whether we should alert the user or not
  let alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  
  // update the check data
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  //update the check to disk
  data.update('checks', newCheckData.id, newCheckData, (err) => {
    if(!err) {
      if(alertWanted){
        // send the check data to next process
      workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Alert is not needed if there is no state change!')
      }
    } else {
      console.log('Error trying to save check data of one of the checks');
    }
  })
}


// send notification sms to user if state changes
workers.alertUserToStatusChange = (newCheckData) => {
  let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()}${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;

  sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if(!err) {
      console.log(`user was alerted to a status change via sms: ${msg}`);
    } else {
      console.log('There was a error sending sms to one of the user')
    }
  })
}


//start the background work
workers.init = () => {
  //execute all the checks
  workers.gatherAllchecks();

  //call the loop so that checks continue
  workers.loop();
};

module.exports = workers;