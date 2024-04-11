//dependencies
const {userHandler} = require('./Handlers/RouteHandlers/userHandler');
const {tokenHandler} = require('./Handlers/RouteHandlers/tokenHandler');
const {checkHandler} = require('./Handlers/RouteHandlers/checkHandler')


const routes = {
  user: userHandler,
  token: tokenHandler,
  check: checkHandler
};

module.exports = routes;