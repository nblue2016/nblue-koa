const nblue = require('nblue')
const Router = require('koa-router')
const JsonMW = require('./../middleware/json')

const aq = nblue.aq
const jsonMW = new JsonMW()

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

  get Config () {
    return this._config
  }

  get Setting () {
    return this._settings
  }

  bind () {
    // declare
    const that = this
    const nkoa = that.Nkoa
    const app = nkoa.App

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
    that.appendMWs(router)

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

    // console.log(router)

    return router
  }

  appendMWs (router) {
    const that = this
    const nkoa = that.Nkoa
    const config = that.Config

    const mws = config.get('middlewares')

    if (mws) {
      if (Array.isArray(mws)) {
        mws.forEach((mw) => router.use(nkoa.getMiddleware(mw)))
      } else {
        router.use(nkoa.getMiddleware(mws))
      }
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

  getSetting (key) {
    const settings = this.Settings || new Map()

    return settings.has(key) ? settings.get(key) : null
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

      that.throw(ctx, err, err.code)
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
    const settings = that.Settings
    const useJSON = settings.has(jsonKey) ? settings.get(jsonKey) : true

    // choose throw error or show json error message
    if (useJSON === false) {
      ctx.throw(code, err.message)
    }

    jsonMW.throw(ctx, err, code)
  }

}

module.exports = SuperRouter
