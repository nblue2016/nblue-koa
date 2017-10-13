// use libraries
const url = require('url')
const core = require('nblue-core')

// use class
const betch = core.betch
const co = core.co

// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const AbstractResponseType = require('./abstract-response-type')
const InvalidArgumentError = OAuth2Server.InvalidArgumentError


class CodeResponseType extends AbstractResponseType {

  // define static value for grant type
  get GrantType () {
    return 'authorization_code'
  }

  buildRedirectUri () {
    // get variants from current instance
    const { client, user, scope, handler, redirectUri } = this

    // check for argument
    if (!redirectUri) {
      throw new InvalidArgumentError('Missing parameter: `redirectUri`')
    }

    // define generator function
    const gen = function *() {
      // define target to make authorization code
      const target = {
        authorizationCode:
          handler.generateAuthorizationCode(client, user, scope),
        expiresAt: handler.getAuthorizationCodeLifetime(client),
        scope,
        redirectUri
      }

      // betch target to create a new authorization code
      const code = yield betch(target, { $fullReturn: true })

      // save new token to database
      yield handler.saveAuthorizationCode(code, client, user)

      // parse redirectUri
      const uri = url.parse(redirectUri, true)

      // append code to uri.query
      uri.query.code = code.authorizationCode
      uri.search = null

      // return value
      return uri
    }

    // invoke generator function
    return co(gen.bind(this))
  }

}

/**
 * Export constructor.
 */
module.exports = CodeResponseType
