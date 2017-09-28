const OAuth2Server = require('oauth2-server')

const AuthenticateHandler = require('./handlers/authenticate-handler')
const AuthorizeHandler = require('./handlers/authorize-handler')
const TokenHandler = require('./handlers/token-handler')

// default value of access token lifetime is one hour
const DefaultAccessTokenLifetime = 60 * 60

// default value of refresh token lifetime is two weeks
const DefaultRefreshTokenLifetime = 60 * 60 * 24 * 14

// default value of authorization code lifetime is 5 minutes.
const DefaultAuthorizationCodeLifetime = 5 * 60

// defaults to true for all grant types
const DefaultRequireClientAuthentication = {}

// create new class of OAuth server inherits from oauth2-server
class Server extends OAuth2Server {

  authenticate (request, response, options, callback) {
    // set default for authenticate
    const opts = {
      addAcceptedScopesHeader: true,
      addAuthorizedScopesHeader: true,
      allowBearerTokensInQueryString: false
    }

    // assigon options to opts
    Object.assign(opts, this.options)

    // return authenticate handle
    return new AuthenticateHandler(opts).
      handle(request, response).
      nodeify(callback)
  }

  authorize (request, response, options, callback) {
    // set default for authorize
    const opts = {
      allowEmptyState: false,
      authorizationCodeLifetime: DefaultAuthorizationCodeLifetime
    }

    // assigon options to opts
    Object.assign(opts, this.options)

    // return authorize handle
    return new AuthorizeHandler(opts).
      handle(request, response).
      nodeify(callback)
  }

  token (request, response, options, callback) {
    // set default for token
    const opts = {
      accessTokenLifetime: DefaultAccessTokenLifetime,
      refreshTokenLifetime: DefaultRefreshTokenLifetime,
      allowExtendedTokenAttributes: false,
      requireClientAuthentication: DefaultRequireClientAuthentication
    }

    // assigon options to opts
    Object.assign(opts, this.options)

    // return authorize handle
    return new TokenHandler(opts).
      handle(request, response).
      nodeify(callback)
  }

}
module.exports = Server
