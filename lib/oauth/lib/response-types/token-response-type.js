// use libraries
const url = require('url')
const qs = require('querystring')
const core = require('nblue-core')

// use class
const betch = core.betch
const co = core.co

// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const AbstractResponseType = require('./abstract-response-type')
const InvalidArgumentError = OAuth2Server.InvalidArgumentError

class TokenResponseType extends AbstractResponseType {

  // define static value for grant type
  get GrantType () {
    return 'implicit'
  }

  buildRedirectUri () {
    // get variants from current instance
    const { client, user, scope, state, handler, redirectUri } = this

    // check for argument
    if (!redirectUri) {
      throw new InvalidArgumentError('Missing parameter: `redirectUri`')
    }

    // define generator function
    const gen = function *() {
      // define target to make token
      const target = {
        accessToken: handler.generateAccessToken(client, user, scope),
        accessTokenExpiresAt: handler.getAccessTokenExpiresAt(client),
        refreshToken: handler.generateRefreshToken(client, user, scope),
        refreshTokenExpiresAt: handler.getRefreshTokenExpiresAt(client),
        scope
      }

      // betch target to create a new token
      const token = yield betch(target, { $fullReturn: true })

      // save new token to database by handler
      yield handler.saveAuthorizationCode(token, client, user)

      // check token value
      if (!token) {
        throw new InvalidArgumentError(
          'Can\'t get authorization token form request'
        )
      }

      // parse redirectUri
      const uri = url.parse(redirectUri, true)

      // create new object for uri hash with required properties
      const hash = {
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: client.accessTokenLifetime || handler.accessTokenLifetime
      }

      // append optional properties
      if (scope) hash.scope = scope
      if (state) hash.state = state

      // set hash to uri
      uri.hash = qs.stringify(hash)
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
module.exports = TokenResponseType
