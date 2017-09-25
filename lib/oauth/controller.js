
// reference libraries
const core = require('nblue-core')
// const OAuth2Server = require('oauth2-server')
const OAuth2Server = require('./lib')
const OAuthRequest = OAuth2Server.Request
const OAuthResponse = OAuth2Server.Response

const Controller = require('./../controllers/super')
const OAuthModel = require('./model')

const co = core.co

// constants definition
const CONFIG_KEY_OF_SERVER = 'server'
const CONFIG_KEY_OF_REQUEST = 'request'
const CONFIG_KEY_OF_RESPONSE = 'response'

class OAuthController extends Controller {

  constructor (nblue, config) {
    super(nblue, config)

    this.initialize(config)

    this._oauthModel = this.createOAuthModel()
    this._oauthServer = this.createOAuthServer()
  }

  // get instance of oauth component
  get Component () {
    return this._component
  }

  // get instance of oauth component's config
  get ComponentConfig () {
    return this.Component ? this.Component.Config : null
  }

  // get instance of oauth server model
  get OAuthModel () {
    return this._oauthModel
  }

  // get instance of oauth server
  get OAuthServer () {
    return this._oauthServer
  }

  initialize (config) {
    // get component manager from nblue
    const cmgr = this.NBlue.ComponentManager

    if (config.has('componentId')) {
      // get identity of component
      const uid = config.get('componentId')

      // get the component by uid
      this._component = cmgr.getComponentByUid(uid)
    } else {
      // set it to null
      this._component = null
    }
  }

  // create new instance of model that used for oauth server
  createOAuthModel (options) {
    // assign options to opts
    const opts = options || {}

    // return new instance of oauth response
    return new OAuthModel(this.Component, opts)
  }

  // create new instance of oauth server
  createOAuthServer (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of component config
    const config = this.ComponentConfig

    // assign options if found server section in config
    if (config && config.has(CONFIG_KEY_OF_SERVER)) {
      // assign options
      Object.assign(
        opts,
        config.get(CONFIG_KEY_OF_SERVER).toObject()
      )
    }

    // assign model to options
    if (!opts.model) opts.model = this.OAuthModel

    // create new instance of oauth server
    return new OAuth2Server(opts)
  }

  // create new instance of oauth server request
  createOAuthRequest (req, options) {
    // assign options to opts
    const opts = options || {}

    // get instance of component config
    const config = this.ComponentConfig

    // assign options if found request section in config
    if (config && config.has(CONFIG_KEY_OF_REQUEST)) {
      Object.assign(
        opts,
        config.get(CONFIG_KEY_OF_REQUEST).toObject()
      )
    }

    // return new instance of oauth request
    return new OAuthRequest(req, opts)
  }

  // create new instance of oauth server response
  createOAuthResponse (response, options) {
    // assign options to opts
    const opts = options || {}

    // get instance of component config
    const config = this.ComponentConfig

    // assign options if found request section in config
    if (config && config.has(CONFIG_KEY_OF_RESPONSE)) {
      Object.assign(
        opts,
        config.get(CONFIG_KEY_OF_RESPONSE).toObject()
      )
    }

    // return new instance of oauth response
    return new OAuthResponse(response, opts)
  }

  // generate context with oauth server request and response
  generateOAuthContext (request, response) {
    // check for arguments
    if (!request) throw new ReferenceError('request')
    if (!response) throw new ReferenceError('response')

    // return array of oauth request and response
    return [
      this.createOAuthRequest(request),
      this.createOAuthResponse(response)
    ]
  }

  // define a function to invoke oauth server method with name
  // it was call by route method
  invoke (ctx, methodName) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!methodName) throw new ReferenceError('methodName')

    // get request and response from context
    const { request, response } = ctx

    // generate oauth request and response
    const [oreq, ores] = this.generateOAuthContext(request, response)

    // get instance of server
    const server = this.OAuthServer

    // get method from oauth serve by name
    const method = server[methodName]

    // create function with binding
    const methodFunc = method.bind(server)

    // get instance of logger
    const logger = this.getLogger()

    // create generator function for method
    const gen = function *() {
      try {
        // invoke server method
        yield methodFunc(oreq, ores)
      } catch (err) {
        if (logger) {
          logger.error(`oauth request failed, details: ${err.message}`)
        }
      } finally {
        // output oauth response
        ctx.respond(ores)
      }
    }

    // co a generator function
    return co(gen.bind(this))
  }

  // define route method of authenticate
  authenticate (ctx) {
    return this.invoke(ctx, 'authenticate')
  }

  // define route method of authorize
  authorize (ctx) {
    return this.invoke(ctx, 'authorize')
  }

  // define route method of token
  token (ctx) {
    return this.invoke(ctx, 'token')
  }

}

module.exports = OAuthController
