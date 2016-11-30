const nblue = require('nblue')
const Router = require('koa-router')
const JsonApp = require('./../middleware/json-app')

const aq = nblue.aq
const jsonApp = new JsonApp()

class SuperRouter {

  constructor (nkoa, config) {
    if (!config) throw new ReferenceError('undefined config')

    this._nkoa = nkoa
    this._config = config
    this._name = config.has('name') ? config.get('name') : 'adapter'
    this._settings = config.has('settings')
      ? config.get('settings')
      : new Map()
  }

  get Name () {
    return this._name
  }

  get Nkoa () {
    return this._nkoa
  }

  get App () {
    return this.Nkoa.App
  }

  get Config () {
    return this._config
  }

  get Settings () {
    return this._settings
  }

  bind () {
    // declare
    const that = this
    const app = that.App

    // create new instance of router by config map
    const router = that.createRouter(that.Config, {})

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
        // fetch all path and mapped adapter method
        for (const [path, adapterMethod] of items) {
          // create new object for method options
          const methodOpts = {}

          // copy properties from parent options
          Object.assign(methodOpts, opts)

          // set some vairants to method options
          methodOpts.config = config
          methodOpts.method = adapterMethod
          methodOpts.path = path

          // get method function by options
          const method = that.getMethod.bind(that, methodOpts)

          // bind method to router
          router[reqMethod](path, method())
        }
      }
    }

    return router
  }

  appendApps (router) {
    const that = this
    const nkoa = that.Nkoa

    const items = that.Config.get('middlewares')

    if (items) {
      const apps = Array.isArray(items) ? items : [items]

      apps.forEach(
        (app) => router.use(nkoa.getApp(app))
      )
    }
  }

  getMethod (options) {
    const that = this
    const opts = options || {}

    const method = opts.method ? opts.method : 'disabled'

    switch (method.toLowerCase()) {
    case 'disable':
      return that.disable()
    case 'pass':
      return that.pass()
    case 'test':
      return that.test()
    default:
      return function *(next) {
        const ctx = this

        ctx.body = { method: opts.method }
        ctx.type = 'json'

        yield next
      }
    }
  }

  getSetting (key, defaultVal) {
    const settings = this.Settings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  // define router method of disable, it will throw 403 error
  disable () {
    const that = this

    return function *() {
      const ctx = this

      yield aq.then(0)

      const err = new Error()

      err.code = 403
      err.message = 'disabled'

      return that.throw(ctx, err, err.code)
    }
  }

  // define router method of pass, it only show empty message
  pass () {
    return function *() {
      const ctx = this

      ctx.status = 200
      ctx.body = { }

      yield aq.then(0)
    }
  }

  // define router method of test, it only used for test
  test () {
    return function *() {
      const ctx = this

      ctx.status = 200
      ctx.body = { test: 'ok' }

      yield aq.then(0)
    }
  }

  throw (ctx, err, code) {
    const that = this
    const jsonKey = 'jsonError'
    const settings = that.Settings || new Map()

    const useJSON = settings.has(jsonKey) ? settings.get(jsonKey) : true

    // choose throw error or show json error message
    if (useJSON === false) {
      ctx.throw(code, err.message)
    }

    jsonApp.throw(ctx, err, code)
  }

}

module.exports = SuperRouter
