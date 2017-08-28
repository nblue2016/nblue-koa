
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

  invoke (methodName) {
    // get instance of server
    const server = this.OAuthServer

    // define function to respond for web server
    const respond = this.respond

    // define function to generate oauth request and response
    const genContextFunc = this.generateOAuthContext.bind(this)

    // create generator function to invoke
    const gen = function *(req, res) {
      // generate oauth request and response
      const [oreq, ores] = genContextFunc(req, res)

      // generate function to respond body
      const respondFunc = respond.bind(this)

      try {
        // get function from server by name
        const methodFunc = server[methodName].bind(server)

        // invoke oauth server function
        if (!methodFunc) {
          throw new Error(`doesn't support method: ${methodName}`)
        }

        // apply async server method
        yield methodFunc(oreq, ores)
      } catch (err) {
        // get instance of logger
        const logger = this.getLogger

        // output error message to logger
        if (logger) {
          logger.error(
            `apply method:${methodName} with error, details: ${err.message}`
          )
        }
      }

      // output result to response
      return respondFunc(ores)
    }

    switch (this.ServerType) {
    case 'express':
      // return middle middleware for express
      return function (req, res, next) {
        // bind context to generator function
        const genFunc = gen.bind(res)

        // co a generator function
        return co(genFunc(req, res)).then(() => next())
      }
    case 'koa':
      // return middle middleware for koa
      return function *() {
        // get context
        const ctx = this

        // bind context to generator function
        const genFunc = gen.bind(ctx)

        // co a generator function
        return yield co(genFunc(ctx.request, ctx.response))
      }
    case 'koa2':
      // return middle middleware for koa2
      return function (ctx) {
        // bind context to generator function
        const genFunc = gen.bind(ctx)

        // co a generator function
        return co(genFunc(ctx.request, ctx.response))
      }
    default:
      throw new Error(`doesn't support for server type: ${this.ServerType}`)
    }
  }

  respond (ores) {
    // get server type base on checking type of this.status
    const type = typeof this.status === 'function' ? 'express' : 'koa'

    // set headers to response
    for (const key of Object.keys(ores.headers)) {
      this.set(key, ores.headers[key])
    }

    // output to response for koa and koa2
    if (type === 'koa') {
      // set status and body to reponse
      this.status = ores.status
      this.body = ores.body
    } else if (type === 'express') {
      this.status(ores.status).json(ores.body)
    }
  }

  authenticate () {
    return this.invoke('authenticate')
  }

  authorize () {
    return this.invoke('authorize')
  }

  token () {
    return this.invoke('token')
  }

}

module.exports = OAuthController
