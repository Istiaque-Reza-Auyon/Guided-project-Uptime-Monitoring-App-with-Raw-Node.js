//dependencies

const {StringDecoder} = require('string_decoder');
const url = require('url');
const routes = require('./../route');
const {notFoundHandler} = require('./../Handlers/RouteHandlers/notFoundHandler');
const {parseJSON} = require('./utilities')

//use scaffolding
const handler = {};

//handle request response
handler.handleReqRes = (req, res) =>{
  //get the url & parse it
  const parseUrl = url.parse(req.url, true);
  const path = parseUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  const method = req.method.toLowerCase();
  const queryStringObject = parseUrl.query;
  const headersObject = req.headers;

  const requestProperties ={
    parseUrl,
    path,
    trimmedPath,
    method,
    queryStringObject,
    headersObject
  }  

  const decoder = new StringDecoder('utf-8');
  let realData = '';

  const chosenHandler = routes[trimmedPath] ? routes[trimmedPath] : notFoundHandler;
  

  req.on('data', (buffer) => {
      realData += decoder.write(buffer);
  })

  req.on('end', () => {
      realData += decoder.end();

      requestProperties.body = parseJSON(realData);

      chosenHandler(requestProperties, (statusCode, payload) => {
        statusCode = typeof statusCode === 'number' ? statusCode : 500;
        payload = typeof payload == 'object' ? payload : {};
    
        const payloadString = JSON.stringify(payload);
        //return the final response
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);

        //handle request
        res.end(payloadString);
      })
  })
  
}

module.exports = handler;