const Super = require('../controllers/super')
const Server = require('oauth2-server')

const Request = Server.Request
const Response = Server.Response

class Controller extends Super {

  consturctor (nblue, config) {
    super(nblue, config)

    const cconfig = this.ControllerConfig

    const opts = {}

    opts.model = require('./model')

    if (cconfig.server) {
      Object.assign(opts, cconfig.server)
    }

    this.oauth = new Server(opts)
  }

  createRequest (req) {
    const config = this.ControllerConfig

    const opts = {}

    if (config.request) {
      Object.assign(opts, config.request)
    }

    return new Request(req, opts)
  }

  createResponse (res) {
    const config = this.ControllerConfig

    const opts = {}

    if (config.request) {
      Object.assign(opts, config.request)
    }

    return new Response(res, opts)
  }

  eauthenticate () {
    const that = this

    return function (req, res, next) {
      const request = that.createRequest(req)
      const response = that.createResponse(res)

      that.oauth.
        authenticate(request, response).
        then(() => next())
    }
  }

  eauthorize () {
    const that = this

    return function (req, res, next) {
      const request = that.createRequest(req)
      const response = that.createResponse(res)

      that.oauth.
        authorize(request, response).
        then(() => next())
    }
  }

  etoken () {
    const that = this

    return function (req, res, next) {
      const request = that.createRequest(req)
      const response = that.createResponse(res)

      that.oauth.
        token(request, response).
        then(() => next())
    }
  }

  kauthenticate () {
    const that = this
    const oauth = this.oauth

    return function *() {
      const ctx = this

      const request = that.createRequest(ctx.req)
      const response = that.createResponse(ctx.res)

      return yield oauth.authenticate(request, response)
    }
  }

  kauthorize () {
    const that = this
    const oauth = this.oauth

    return function *() {
      const ctx = this

      const request = that.createRequest(ctx.req)
      const response = that.createResponse(ctx.res)

      return yield oauth.authorize(request, response)
    }
  }

  ktoken () {
    const that = this
    const oauth = this.oauth

    return function *() {
      const ctx = this

      const request = that.createRequest(ctx.req)
      const response = that.createResponse(ctx.res)

      return yield oauth.token(request, response)
    }
  }

}

module.exports = Controller
