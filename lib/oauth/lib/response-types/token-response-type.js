// use libraries
const url = require('url')
const qs = require('querystring')

// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const InvalidArgumentError = OAuth2Server.InvalidArgumentError

class CodeResponseType {

  constructor (options) {
    const opts = options || {}

    if (!opts.accessToken) {
      throw new InvalidArgumentError('Missing parameter: `accessToken`')
    }

    this.options = opts
  }

  buildRedirectUri (redirectUri) {
    if (!redirectUri) {
      throw new InvalidArgumentError('Missing parameter: `redirectUri`')
    }

    const uri = url.parse(redirectUri, true)
    const opts = this.options

    const hash = {
      access_token: opts.accessToken
    }

    hash.token_type = opts.tokenType
    hash.expires_in = opts.accessTokenExpiresIn
    if (opts.scope) hash.scope = opts.scope
    if (opts.state) hash.state = opts.state

    uri.hash = qs.stringify(hash)
    uri.search = null

    return uri
  }

}

/**
 * Export constructor.
 */
module.exports = CodeResponseType
