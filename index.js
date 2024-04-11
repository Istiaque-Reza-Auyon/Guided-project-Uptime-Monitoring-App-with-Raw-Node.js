//import necessary modules
const server = require('./lib/server');
const workers = require('./lib/worker');

// USE SCAFFOLDING

const app = {};

app.init = () => {
    // start the server
    server.init();
    //start the workers
    workers.init();
}

app.init();

//export the app
module.exports = app;