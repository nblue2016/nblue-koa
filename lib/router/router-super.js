const nblue = require('nblue-core')
const ConfigMap = nblue.ConfigMap
const Router = require('koa-router')
const aq = nblue.aq

const KEY_ROUTES = 'routes'
const KEY_MERGE_ROUTES = 'mergeRoutes'

class SuperRouter {

  constructor (nkoa, config) {
    if (!config) throw new ReferenceError('undefined config')

    this._nkoa = nkoa
    this._name = config.has('name') ? config.get('name') : 'router'
    this._routerConfig = config
  }

  get Name () {
    return this._name
  }

  get Nkoa () {
    return this._nkoa
  }

  get Application () {
    return this.Nkoa.Application
  }

  get ApplicationManager () {
    return this.Nkoa.ApplicationManager
  }

  get RouterManager () {
    return this.Nkoa.RouterManager
  }

  get Context () {
    return this.Application.Context
  }

  get Config () {
    return this.Nkoa.Config
  }

  get Settings () {
    return this.Config.Settings
  }

  get Logger () {
    return this.Nkoa.Logger
  }

  get Schemas () {
    const amgr = this.ApplicationManager
    const dataApp = amgr.getApplication('data')

    return dataApp.Schemas
  }

  get RouterConf () {
    return this._routerConfig
  }

  bind () {
    // declare
    const that = this
    const app = that.Application

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
    that.use(router)

    // generate routes definition
    const routes = that.getRoutes(config, opts)

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

    return router
  }

  use (router) {
    // assign this to that
    const that = this
    const nkoa = that.Nkoa

    // get middlewares for current router
    const amgr = nkoa.ApplicationManager

    // bind every middleware to current router
    that.RouterConf.
      getArray('middlewares').
      map((name) => amgr.getApplication(name)).
      filter((mw) => mw).
      forEach(
        (mw) => {
          if (mw && mw.koa && typeof mw.koa === 'function') {
            router.use(mw.koa())
          }
        }
      )
  }

  getRoutes (config, options) {
    if (!config) throw new Error('null argument of config')

    const that = this
    const opts = options || {}
    const rmgm = that.RouterManager
    const settings = config.Settings || new Map()

    const routes = new ConfigMap()
    const mergeRoutes = settings.get(KEY_MERGE_ROUTES, null)

    if (mergeRoutes) {
      const mergeConfig = rmgm.ConfigMaps.get(mergeRoutes)

      if (mergeConfig && mergeConfig.has(KEY_ROUTES)) {
        routes.merge(mergeConfig.get(KEY_ROUTES))
      }
    }

    if (opts.config &&
        opts.config.has(KEY_ROUTES)) {
      routes.merge(opts.config.get(KEY_ROUTES))
    }

    if (config.has(KEY_ROUTES)) {
      routes.merge(config.get(KEY_ROUTES))
    }

    return routes
  }

  getMethod (method) {
    const that = this

    switch (method.toLowerCase()) {
    case 'disable':
      return that.mdisable()
    case 'pass':
      return that.mpass()
    case 'test':
      return that.mtest()
    default:
      return function *(next) {
        const ctx = this

        ctx.body = { method }
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
  mdisable () {
    const that = this

    return function *() {
      const ctx = this

      yield aq.then(0)

      const err = new Error('disabled')

      return yield that.$fail(ctx, err, { status: 403 })
    }
  }

  // define router method of pass, it only show empty message
  mpass () {
    const that = this

    return function *() {
      yield that.$ok(this, {})
    }
  }

  // define router method of test, it only used for test
  mtest () {
    const that = this

    return function *() {
      yield that.$ok(this, { test: 'ok' })
    }
  }

  $fail (ctx, err, options) {
    const that = this
    const amgr = that.ApplicationManager
    const logger = that.Logger

    const jsonApp = amgr.getApplication('json')
    const opts = options || {}
    const status = opts.status || 500

    if (logger) {
      logger.error(
        `Unknow issue occured, details: ${err.message}`,
        opts.name || 'router'
      )
    }

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
    const amgr = that.ApplicationManager
    const jsonApp = amgr.getApplication('json')

    const opts = options || {}

    jsonApp.setHeaders(ctx, that.Settings)
    jsonApp.setBody(ctx, body, opts)

    return Promise.resolve(null)
  }

}

module.exports = SuperRouter
