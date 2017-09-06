
// reference libraries
const core = require('nblue-core')
const co = core.co

const Controller = require('./../controllers/super')

const OAuthModel = require('./model')
const OAuth2Server = require('oauth2-server')
const OAuthRequest = OAuth2Server.Request
const OAuthResponse = OAuth2Server.Response

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

  get Component () {
    return this._component
  }

  get OAuthModel () {
    return this._oauthModel
  }

  get OAuthServer () {
    return this._oauthServer
  }

  get ComponentConfig () {
    return this.Component ? this.Component.Config : null
  }

  initialize (config) {
    // get component manager from nblue
    const cmgr = this.NBlue.ComponentManager

    // set instance of component if found it in config
    if (config.has('creator')) {
      this._component = cmgr.getComponent(config.get('creator'))
    } else {
      this._component = null
    }
  }

  createOAuthModel (options) {
    // assign options to opts
    const opts = options || {}

    // return new instance of oauth response
    return new OAuthModel(this.Component, opts)
  }

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

  createOAuthResponse (res, options) {
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
    return new OAuthResponse(res, opts)
  }

  generateOAuthContext (req, res) {
    return [
      this.createOAuthRequest(req),
      this.createOAuthResponse(res)
    ]
  }

  invoke (ctx, methodName) {
    // get instance of server
    const server = this.OAuthServer

    // get request and response from context
    const { request, response } = ctx

    // generate oauth request and response
    const [oreq, ores] = this.generateOAuthContext(request, response)

    // get function from server by name
    const methodFunc = server[methodName].bind(server)

    // create generator function for method
    const gen = function *() {
      // invoke server method
      yield methodFunc(oreq, ores)

      // output oauth response
      return ctx.respond(ores)
    }

    // co a generator function
    return co(gen.bind(this))
  }

  authenticate (ctx) {
    return this.invoke(ctx, 'authenticate')
  }

  authorize (ctx) {
    return this.invoke(ctx, 'authorize')
  }

  token (ctx) {
    return this.invoke(ctx, 'token')
  }

}

module.exports = OAuthController
