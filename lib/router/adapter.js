const nblue = require('nblue')
const Router = require('koa-router')
const mwJson = require('./../middleware/json')
const aq = nblue.aq
// const ConfigMap = nblue.ConfigMap

class Adapter {

  constructor (config) {
    if (!config) throw new ReferenceError('undefined config')

    this._config = config
    this._name = config.has('name') ? config.get('name') : 'adapter'
    this._settings = config.has('settings')
      ? config.get('settings')
      : new Map()
  }

  bind (app) {
    // declare
    const that = this

    // create new instance of router by config map
    const router = that.createRouter(app, this._config, {})

    // convert router to middlewares
    if (router) {
      app.use(router.routes(), router.allowedMethods())
    }
  }

  createRouter (app, config, options) {
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

    if (config.has('methods')) {
      // get methods defined in config file
      const methods = config.get('methods')

      // fetch all web methods and mapped items
      for (const [webMethod, items] of methods) {
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
          router[webMethod](path, method())
        }
      }
    }

    return router
  }

  appendMWs () {
    return
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
    const settings = this._settings || new Map()

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
    // choose throw error or show json error message
    if (this._settings.has('jsonError') &&
        this._settings.get('jsonError') === false) {
      ctx.throw(code, err.message)
    }

    mwJson.throw(ctx, err, code)
  }

}

module.exports = Adapter
