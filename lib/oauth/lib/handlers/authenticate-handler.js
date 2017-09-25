const getHandler = require('./get-handler')
const Handler = getHandler('authenticate')

class AuthenticateHandler extends Handler
{

}

module.exports = AuthenticateHandler
