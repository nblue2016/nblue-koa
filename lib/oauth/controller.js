
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

  invoke (funName) {
    // declare
    const server = this.OAuthServer
    const genFunc = this.generateOAuthContext.bind(this)
    const sendToResFunc = this.sendToResponse.bind(this)

    // create function for invoke oauth server method
    const invokeFunc = (req, res) => {
      // get function from server by name
      const func = server[funName].bind(server)

      // invoke oauth server function
      if (func) return func(req, res)

      // response error message
      return this.generateResponse(
        new Error(`doesn't support method: ${funName}`)
      )
    }

    switch (this.ServerType) {
    case 'express':
      // return middle middleware for express
      return function (req, res, next) {
        // generate oauth request and response
        const [oreq, ores] = genFunc(req, res)

        // invoke oauth server function
        return invokeFunc(oreq, ores).
          then(() => next()).
          catch((err) => sendToResFunc(err, { req, res }))
      }
    case 'koa':
      // return middle middleware for koa
      return function *() {
        // get context
        const ctx = this

        // generate oauth request and response
        const [oreq, ores] = genFunc(ctx.request, ctx.response)

        try {
          // invoke oauth server function
          yield invokeFunc(oreq, ores)

          for (const key of Object.keys(ores.headers)) {
            ctx.set(key, ores.headers[key])
          }

          ctx.body = ores.body
          ctx.status = ores.status || 200
          if (ctx.status !== 302) ctx.body = null
        } catch (err) {
          ctx.error = err
          ctx.status = err.status || 500

          sendToResFunc(err, { ctx, status: ctx.status })
        }

        return Promise.resolve()
      }
    case 'koa2':
      // return middle middleware for koa2
      return function (ctx) {
        // generate oauth request and response
        const [oreq, ores] = genFunc(ctx.request, ctx.response)

        // invoke oauth server function
        return invokeFunc(oreq, ores).
          then(() => sendToResFunc(ores.body, { ctx })).
          catch((err) => sendToResFunc(err, { ctx }))
      }
    default:
      throw new Error(`doesn't support for server type: ${this.ServerType}`)
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

  test () {
    return this.generateResponse({ test: 'ok' })
  }

  bad () {
    return this.invoke('bad')
  }

}

module.exports = OAuthController
