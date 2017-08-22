
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
    return this.generateResponse({
      test: 'ok'
    })
  }

  invoke (funName) {
    // declare
    const server = this._server
    const genFunc = this.generateContext.bind(this)

    const invokeFunc = (req, res) => {
      // generate oauth request and response
      const [request, response] = genFunc(req, res)

      // invoke oauth server function
      return server[funName](request, response)
    }

    switch (this.ServerType) {
    case 'express':
      // return express middle middleware
      return (req, res, next) => invokeFunc(req, res).then(() => next())
    case 'koa':
        // return koa middle middleware
      return function *() {
        const ctx = this

        return yield invokeFunc(ctx.req, ctx.res)
      }
    case 'koa2':
      // return koa2 middle middleware
      return (ctx) => invokeFunc(ctx.req, ctx.res)
    default:
      return this.generateResponse({
        test: 'ok'
      })
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

  /* eauthenticate () {
    // declare
    const server = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (req, res, next) {
      // generate oauth request and response
      const [request, response] = genFunc(req, res)

      // invoke oauth server function
      return server.
        authenticate(request, response).
        then(() => next())
    }
  }

  eauthorize () {
    // declare
    const server = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (req, res, next) {
      // generate oauth request and response
      const [request, response] = genFunc(req, res)

      // invoke oauth server function
      return server.
        authorize(request, response).
        then(() => next())
    }
  }

  etoken () {
    // declare
    const server = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (req, res, next) {
      // generate oauth request and response
      const [request, response] = genFunc(req, res)

      // invoke oauth server function
      return server.
        token(request, response).
        then(() => next())
    }
  }

  kauthenticate () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function *() {
      // get current context
      const ctx = this

      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return yield oauth.authenticate(request, response)
    }
  }

  kauthorize () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function *() {
      // get current context
      const ctx = this

      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return yield oauth.authorize(request, response)
    }
  }

  ktoken () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function *() {
      // get current context
      const ctx = this

      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return yield oauth.token(request, response)
    }
  }

  k2authenticate () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (ctx) {
      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return oauth.authenticate(request, response)
    }
  }

  k2authorize () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (ctx) {
      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return oauth.authorize(request, response)
    }
  }

  k2token () {
    // declare
    const oauth = this._server
    const genFunc = this.generateContext.bind(this)

    // return route middleware
    return function (ctx) {
      // generate oauth request and response
      const [request, response] = genFunc(ctx.req, ctx.res)

      // invoke oauth server function
      return oauth.token(request, response)
    }
  } */

}

module.exports = OAuthController
