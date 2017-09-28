// use libraries
const getHandler = require('./get-handler')

// get class of super handler
const Handler = getHandler('authenticate')

// define new handler inherts from one in oauth2-server
class AuthenticateHandler extends Handler
{

}

// exports new class
module.exports = AuthenticateHandler
