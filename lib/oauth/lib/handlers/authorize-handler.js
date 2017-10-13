// use libraries
const core = require('nblue-core')

// get class of super handler
const getHandler = require('./get-handler')

// get class of hander by name
const Handler = getHandler('authorize')

// get defined classes from oauth2 server
const OAuth2Server = require('oauth2-server')
const Request = OAuth2Server.Request
const Response = OAuth2Server.Response
const AccessDeniedError = OAuth2Server.AccessDeniedError
const InvalidArgumentError = OAuth2Server.InvalidArgumentError
const InvalidRequestError = OAuth2Server.InvalidRequestError
const InvalidScopeError = OAuth2Server.InvalidScopeError
const OAuthError = OAuth2Server.OAuthError
const ServerError = OAuth2Server.ServerError
const UnauthorizedClientError = OAuth2Server.UnauthorizedClientError
const UnsupportedResponseTypeError = OAuth2Server.UnsupportedResponseTypeError

const aq = core.aq
const co = core.co

const CodeResponseType = 'code'
const TokenResponseType = 'token'

const responseTypes = {}

responseTypes[CodeResponseType] =
  require('../response-types/code-response-type')
responseTypes[TokenResponseType] =
  require('../response-types/token-response-type')

// define new handler inherts from one in oauth2-server
class AuthorizeHandler extends Handler
{

  constructor (options) {
    const opts = options || {}

    super(opts)

    this.accessTokenLifetime = opts.accessTokenLifetime
    this.refreshTokenLifetime = opts.refreshTokenLifetime
  }

  handle (request, response) {
    if (!(request instanceof Request)) {
      throw new InvalidArgumentError(
        'Invalid argument: `request` must be an instance of Request'
      )
    }

    if (!(response instanceof Response)) {
      throw new InvalidArgumentError(
        'Invalid argument: `response` must be an instance of Response'
      )
    }

    if (request.query.allowed === 'false') {
      return Promise.reject(
        new AccessDeniedError(
          'Access denied: user denied access to application'
        )
      )
    }

    const gen = function *() {
      // get instance of client from request
      const client = yield this.getClient(request)

      // get uri from request by client
      const uri = this.getRedirectUri(request, client)

      // get state from request
      const state = this.getState(request)

      try {
        // get instance of user from request
        const user = yield this.getUser(request)

        // get scope from request
        let scope = this.getScope(request)

        // get validate scope by model
        scope = yield aq.then(this.validateScope(user, client, scope))

        // check scope
        if (!scope) {
          throw new InvalidScopeError(
            'Invalid scope: Requested scope is invalid'
          )
        }

        // get response type from request
        const responseType = this.getResponseType(request)

        // throw error if current response type wasn't supportted
        if (!responseTypes[responseType]) {
          throw new UnsupportedResponseTypeError(
            'Unsupported response type: `response_type` is not supported'
          )
        }

        // get class of resposne type
        const ResponseType = responseTypes[responseType]

        // create options for response type instance
        const responseOpts = { client, user, scope, state, redirectUri: uri }

        // create new instance of response type
        const responseTypeInst = new ResponseType(this, responseOpts)

        // get grant type from instance of response type
        const grantType = responseTypeInst.GrantType

        // check grant type for current client
        if (!client.grants.includes(grantType)) {
          throw new UnauthorizedClientError(
            'Unauthorized client: `grant_type` is invalid'
          )
        }

        // build redirect uri by response type
        const redirectUri =
          yield aq.then(responseTypeInst.buildRedirectUri(uri))

        // update response output
        if (responseType === TokenResponseType) {
          this.updateResponse(response, redirectUri)
        } else {
          this.updateResponse(response, redirectUri, state)
        }
      } catch (err) {
        // assign error to new error
        let newError = err

        // wrap error to a ServerError if it isn't a OAuthError
        if (!(err instanceof OAuthError)) {
          newError = new ServerError(err)
        }

        // build error redirect uri
        const redirectUri = this.buildErrorRedirectUri(uri, newError)

        // update response output
        this.updateResponse(response, redirectUri, state)

        // throw new error
        throw newError
      }
    }

    return co(gen.bind(this))
  }

  // ignore this method now
  // getUser (request, response)
  getUser () {
    return Promise.resolve()
  }

  getResponseType (request) {
    // get response type value from request body or query
    const responseType =
      request.body.response_type || request.query.response_type

    if (!responseType) {
      throw new InvalidRequestError('Missing parameter: `response_type`')
    }

    return responseType
  }

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

  validateScope (user, client, scope) {
    // get instance of model from current
    const model = this.model

    // invoke validateScope method by model
    return model.validateScope(user, client, scope)
  }

  generateAccessToken (client, user, scope) {
    // get instance of model from current
    const model = this.model

    // invoke generateAccessToken method by model
    return model.generateAccessToken(user, client, scope)
  }

  getAccessTokenExpiresAt (client) {
    // get access token life time
    const accessTokenLifetime =
      client.accessTokenLifetime || this.accessTokenLifetime

    // create new datetime for expires
    const expires = new Date()

    // append life time to datetime
    expires.setSeconds(expires.getSeconds() + accessTokenLifetime)

    // return value
    return expires
  }

  generateRefreshToken (client, user, scope) {
    // get instance of model from current
    const model = this.model

    // invoke generateRefreshToken method by model
    return model.generateRefreshToken(user, client, scope)
  }

  getRefreshTokenExpiresAt (client) {
    // get refresh token life time
    const refreshTokenLifetime =
      client.refreshTokenLifetime || this.refreshTokenLifetime

    // create new datetime for expires
    const expires = new Date()

    // append life time to datetime
    expires.setSeconds(expires.getSeconds() + refreshTokenLifetime)

    // return value
    return expires
  }

  saveAuthorizationCode (token, client, user) {
    // get instance of model from current
    const model = this.model

    // invoke saveToken method by model
    return model.saveAuthorizationCode(token, client, user)
  }

  saveToken (token, client, user) {
    // get instance of model from current
    const model = this.model

    // invoke saveToken method by model
    return model.saveToken(token, client, user)
  }

}

// exports new class
module.exports = AuthorizeHandler
