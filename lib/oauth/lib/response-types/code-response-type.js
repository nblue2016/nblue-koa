// use libraries
const url = require('url')

// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const InvalidArgumentError = OAuth2Server.InvalidArgumentError

class CodeResponseType {

  constructor (options) {
    const opts = options || {}

    if (!opts.code) {
      throw new InvalidArgumentError('Missing parameter: `code`')
    }

    this.options = opts
  }

  buildRedirectUri (redirectUri) {
    if (!redirectUri) {
      throw new InvalidArgumentError('Missing parameter: `redirectUri`')
    }

    const uri = url.parse(redirectUri, true)
    const opts = this.options

    uri.query.code = opts.code
    uri.search = null

    return uri
  }

}

/**
 * Export constructor.
 */
module.exports = CodeResponseType
