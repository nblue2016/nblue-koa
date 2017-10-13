// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const InvalidArgumentError = OAuth2Server.InvalidArgumentError
const ServerError = OAuth2Server.ServerError

class AbstractResponseType {

  constructor (handler, options) {
    // assign options to opts
    const opts = options || {}

    // check for argument
    if (!handler) {
      throw new InvalidArgumentError('Missing parameter: `handler`')
    }

    // initialize variants
    this.handler = handler

    this.client = opts.client
    this.user = opts.user
    this.scope = opts.scope
    this.state = opts.state
    this.redirectUri = opts.redirectUri
  }

  get GrantType () {
    throw new ServerError('Not implemented.')
  }

  generateData () {
    throw new ServerError('Not implemented.')
  }

  buildRedirectUri () {
    throw new ServerError('Not implemented.')
  }

}

module.exports = AbstractResponseType
