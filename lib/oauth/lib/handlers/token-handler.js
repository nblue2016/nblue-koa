// use libraries
const getHandler = require('./get-handler')

// get class of super handler
const Handler = getHandler('token')

// define new handler inherts from one in oauth2-server
class TokenHandler extends Handler
{

}

// exports new class
module.exports = TokenHandler
