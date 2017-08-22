
const Controller = require('./../controllers/super')
const Model = require('./model')
const Server = require('oauth2-server')
const Request = Server.Request
const Response = Server.Response

const CONFIG_KEY_OF_SERVER = 'server'
const CONFIG_KEY_OF_REQUEST = 'request'
const CONFIG_KEY_OF_RESPONSE = 'response'

class OAuthController extends Controller {

  constructor (nblue, config) {
    super(nblue, config)

    this.initialize(config)

    const componentConfig = this.ComponentConfig

    // create options for oauth server
    const opts = {}
    const modelOpts = {}

    if (componentConfig.has(CONFIG_KEY_OF_SERVER)) {
      opts.server = componentConfig.get(CONFIG_KEY_OF_SERVER).toObject()
    }

    opts.model = new Model(nblue, modelOpts)
    modelOpts.component = this.Component

    this._server = new Server(opts)
  }

  get Component () {
    return this._component
  }

  get ComponentConfig () {
    return this.Component ? this.Component.Config : null
  }

  initialize (config) {
    const cmgr = this.NBlue.ComponentManager

    if (config.has('creator')) {
      this._component = cmgr.getComponent(config.get('creator'))
    } else {
      this._component = null
    }
  }

  createRequest (req) {
    const config = this.ComponentConfig

    const opts = {}

    if (config && config.has(CONFIG_KEY_OF_REQUEST)) {
      Object.assign(
        opts,
        config.get(CONFIG_KEY_OF_REQUEST).toObject()
      )
    }

    return new Request(req, opts)
  }

  createResponse (res) {
    const config = this.ComponentConfig

    const opts = {}

    if (config && config.has(CONFIG_KEY_OF_RESPONSE)) {
      Object.assign(
        opts,
        config.get(CONFIG_KEY_OF_RESPONSE).toObject()
      )
    }

    return new Response(res, opts)
  }

  generateContext (req, res) {
    return [
      this.createRequest(req),
      this.createResponse(res)
    ]
  }

  test () {
    return this.generateResponse({ test: 'ok' })
  }

  bad () {
    return this.invoke('bad')
  }

  invoke (funName) {
    // declare
    const server = this._server
    const genFunc = this.generateContext.bind(this)

    const invokeFunc = (req, res) => {
      // generate oauth request and response
      const [request, response] = genFunc(req, res)

      if (server[funName]) {
        // invoke oauth server function
        return server[funName](request, response)
      }

      return this.generateResponse(
        new Error(`doesn't support method: ${funName}`)
      )
    }

    switch (this.ServerType) {
    case 'express':
      // return middle middleware for express
      return (req, res, next) => invokeFunc(req, res).then(() => next())
    case 'koa':
      // return middle middleware for koa
      return function *() {
        const ctx = this

        return yield invokeFunc(ctx.request, ctx.response)
      }
    case 'koa2':
      // return middle middleware for koa2
      return (ctx) => invokeFunc(ctx.request, ctx.response)
    default:
      throw new Error(`doesn't support for server type: ${this.ServerType}`)
    }
  }

  authenticate () {
    return this.invkoe('authenticate')
  }

  authorize () {
    return this.invkoe('authorize')
  }

  token () {
    return this.invkoe('token')
  }

}

module.exports = OAuthController
