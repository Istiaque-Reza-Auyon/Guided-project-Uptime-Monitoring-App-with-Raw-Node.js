//import necessary modules

const http = require('http');
const {handleReqRes} = require('../helpers/handleReqRes');
const environment = require('../helpers/environments');

// USE SCAFFOLDING

const server = {};


// create server

server.createServer = () => {
    const createServerVariable = http.createServer(handleReqRes);
    createServerVariable.listen(environment.port, () => console.log(`The server is running at http://localhost:${environment.port}`));
};



//start the server
server.init = () => {
  server.createServer();
};

module.exports = server;