const core = require('nblue-core')

const getHandler = require('./get-handler')
const Handler = getHandler('authorize')

const aq = core.aq

class AuthorizeHandler extends Handler
{

  generateAuthorizationCode (client, user, scope) {
    // get model for current instance
    const model = this.model

    // check generate function was define or not for authorization code
    if (model.generateAuthorizationCode) {
      // get generate function and bind model
      const genFunc = model.generateAuthorizationCode.bind(model)

      // invoke generate to a Promise
      return aq.then(genFunc(client, user, scope))
    }

    // otherwise, use super one
    return super.generateAuthorizationCode(client, user, scope)
  }

}

module.exports = AuthorizeHandler
