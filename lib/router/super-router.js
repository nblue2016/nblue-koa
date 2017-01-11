const nblue = require('nblue-core')
const Router = require('koa-router')
const JsonApp = require('./../middleware/json-app')
const Context = require('.././context')

const aq = nblue.aq
const jsonApp = new JsonApp()

class SuperRouter {

  constructor (app, config) {
    if (!config) throw new ReferenceError('undefined config')

    this._app = app
    this._routerConfig = config
    this._name = config.has('name') ? config.get('name') : 'router'
    this._settings = config.Settings
  }

  get Name () {
    return this._name
  }

  get App () {
    return this._app
  }

  get Context () {
    return this.App.context
  }

  get RouterConf () {
    return this._routerConfig
  }

  get Settings () {
    return this._settings
  }

  bind () {
    // declare
    const that = this
    const app = that.App

    // create new instance of router by config map
    const router = that.createRouter(that.RouterConf, {})

    // convert router to middlewares
    if (router) {
      app.use(router.routes(), router.allowedMethods())
    }
  }

  createRouter (config, options) {
    // declare
    const that = this
    const opts = options || {}

    // set prefix for current router
    if (config.has('prefix') && !opts.prefix) {
      opts.prefix = config.get('prefix')
    }

    // create new instance of router by options
    const router = new Router(opts)

    // load middlewares for current router
    that.appendApps(router)

    if (config.has('routes')) {
      // get routes defined in config file
      const routes = config.get('routes')

      // fetch all web methods and mapped items
      for (const [reqMethod, items] of routes) {
        // fetch all path and mapped route method
        for (const [path, method] of items) {
          // get method function by options
          const methodFunc = that.getMethod.bind(that)

          // bind method to router
          router[reqMethod](path, methodFunc(method || 'disabled', opts))
        }
      }
    }

    return router
  }

  appendApps (router) {
    // declare
    const that = this
    const app = that.App

    // get middlewares for current router
    const names = that.RouterConf.getArray('middlewares')

    // bind every middleware to current router
    names.forEach(
      (name) => router.use(Context.getApp(app, name))
    )
  }

  getMethod (method) {
    const that = this

    switch (method.toLowerCase()) {
    case 'disable':
      return that.$disable()
    case 'pass':
      return that.$pass()
    case 'test':
      return that.$test()
    default:
      return function *(next) {
        const ctx = this

        ctx.body = { method }
        ctx.type = 'json'

        yield next
      }
    }
  }

  getConfig (ctx) {
    return Context.getConfig(ctx || this.Context)
  }

  getLogger (ctx) {
    return Context.getLogger(ctx || this.Context)
  }

  getSchemas (ctx) {
    return Context.getSchemas(ctx || this.Context)
  }

  getConnections (ctx) {
    return Context.getConnections(ctx || this.Context)
  }

  getSetting (key, defaultVal) {
    const settings = this.Settings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  // define router method of disable, it will throw 403 error
  $disable () {
    const that = this

    return function *() {
      const ctx = this

      yield aq.then(0)

      const err = new Error('disabled')

      return yield that.$fail(ctx, err, { status: 403 })
    }
  }

  // define router method of pass, it only show empty message
  $pass () {
    const that = this

    return function *() {
      yield that.$ok(this, {})
    }
  }

  // define router method of test, it only used for test
  $test () {
    const that = this

    return function *() {
      yield that.$ok(this, { test: 'ok' })
    }
  }

  $fail (ctx, err, options) {
    const that = this

    const opts = options || {}
    const status = opts.status || 500

    const settings = that.Settings || new Map()
    const jsonKey = 'jsonError'

    // choose throw error or show json error message
    if (settings.has(jsonKey) &&
        settings.get(jsonKey) === false) {
      ctx.throw(status, err.message)
    } else {
      jsonApp.setError(
        ctx,
        err, {
          status,
          settings
        })
    }

    return Promise.resolve(null)
  }

  $ok (ctx, body, options) {
    const that = this
    const opts = options || {}

    jsonApp.setHeaders(ctx, that.Settings)
    jsonApp.setBody(ctx, body, opts)

    return Promise.resolve(null)
  }

}

module.exports = SuperRouter
