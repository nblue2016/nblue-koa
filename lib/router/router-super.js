const core = require('nblue-core')

const ConfigMap = core.ConfigMap

const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_PREFIX = 'prefix'
const CONFIG_KEY_OF_ROUTES = 'routes'
const CONFIG_KEY_OF_MERGE_ROUTER = 'mergeRouter'

const DEFAULT_VALUE_OF_ROUTER_NAME = 'router'

class SuperRouter {

  constructor (napp, config) {
    if (!config) throw new ReferenceError('undefined config')

    this._napp = napp
    this._name = config.has(CONFIG_KEY_OF_ROUTER_NAME)
      ? config.get(CONFIG_KEY_OF_ROUTER_NAME)
      : DEFAULT_VALUE_OF_ROUTER_NAME

    this._routerConfig = config
  }

  get Name () {
    return this._name
  }

  get NApp () {
    return this._napp
  }

  get ServerType () {
    return this.NApp.ServerType
  }

  get ApplicationManager () {
    return this.NApp.ApplicationManager
  }

  get RouterManager () {
    return this.NApp.RouterManager
  }

  get WebApplication () {
    return this.NApp.Application
  }

  get WebConfig () {
    return this.NApp.Config
  }

  get WebSettings () {
    return this.WebConfig.Settings
  }

  get Logger () {
    return this.NApp.Logger
  }

  get RouterConfig () {
    return this._routerConfig
  }

  get RouterSettings () {
    return this.RouterConfig.Settings
  }

  getAppByName (name) {
    const amgr = this.ApplicationManager

    return amgr.getApplication(name)
  }

  bind () {
    // get instance of config for current router
    const config = this.RouterConfig

    // create new instance of router by config map
    const router = this.createRouter(config, {})

    // get instance of web application
    const app = this.WebApplication

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
    if (config.has(CONFIG_KEY_OF_PREFIX) && !opts.prefix) {
      opts.prefix = config.get(CONFIG_KEY_OF_PREFIX)
    }

    // create new instance of router with options
    const router = that.createRouterInstance(opts)

    // use middlewares for current router
    that.use(router)

    // generate routes definition
    const routes = that.getRoutes(config, opts)

    // return null if there is no router defined
    if (!routes) return null

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

    // return created router
    return router
  }

  createRouterInstance (options) {
    // assign options to opts
    const opts = options || {}

    // get class for Router
    const Router = (() => {
      switch (this.ServerType) {
      default:
        return require('koa-router')
      }
    })()

    // return new instance of Router
    return new Router(opts)
  }

  use (router) {
    // bind get application function
    const getAppByName = this.getAppByName.bind(this)

    // bind every middleware to current router
    const names = this.RouterConfig.
                        getArray('middlewares').
                        map((name) => getAppByName(name))

    // load middlewares for current router
    switch (this.ServerType) {
    default:
      names.
        filter((mw) => mw && mw.koa && typeof mw.koa === 'function').
        forEach((mw) => router.use(mw.koa()))
      break
    }
  }

  getRoutes (config, options) {
    // return null if config is null
    if (!config) return null

    // assign this to that
    const that = this
    const opts = options || {}

    // create new map of routes
    const routes = new ConfigMap()

    // get settings from config
    const settings = config.Settings || new Map()

    // get name of router that need merge
    const mergeRouter = settings.get(CONFIG_KEY_OF_MERGE_ROUTER, null)

    // if the name exists
    if (mergeRouter) {
      // get instance of router manager
      const rmgm = that.RouterManager

      // get config by target router name
      const mergeConfig = rmgm.ConfigMaps.get(mergeRouter)

      // merge config of target router
      if (mergeConfig && mergeConfig.has(CONFIG_KEY_OF_ROUTES)) {
        routes.merge(mergeConfig.get(CONFIG_KEY_OF_ROUTES))
      }
    }

    // if exists exists routes setting in options
    if (opts.config &&
        opts.config.has(CONFIG_KEY_OF_ROUTES)) {
      // merge routes settings from options
      routes.merge(opts.config.get(CONFIG_KEY_OF_ROUTES))
    }

    // if exists routes setting in config
    if (config.has(CONFIG_KEY_OF_ROUTES)) {
      // merge routes settings from config
      routes.merge(config.get(CONFIG_KEY_OF_ROUTES))
    }

    // return map of routes
    return routes
  }

  getMethod (method) {
    const that = this

    const methodFunc = this.getMethodByName(method)

    if (methodFunc) {
      methodFunc.bind(this)

      return methodFunc()
    }

    switch (method.toLowerCase()) {
    case 'disable':
      return that.kdisable()
    case 'pass':
      return that.kpass()
    case 'test':
      return that.ktest()
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
    const settings = this.WebSettings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  getMethodByName (name) {
    const methodName = ((type) => {
      switch (type) {
      case 'koa2':
        return `k2${name}`
      case 'koa':
      default:
        return `k${name}`
      }
    })(this.ServerType)

    return this[methodName]
  }

  // define router method of disable, it will throw 403 error
  kdisable () {
    const that = this

    return function *() {
      return yield that.toKoaResponse(
        this,
        new Error('disabled'),
        { status: 403 }
      )
    }
  }

  // define router method of pass, it only show empty message
  kpass () {
    const that = this

    return function *() {
      yield that.toKoaResponse(this, {})
    }
  }

  // define router method of test, it only used for test
  ktest () {
    const that = this

    return function *() {
      yield that.toKoaResponse(this, { test: 'ok' })
    }
  }

  toKoaResponse (ctx, target, options) {
    const opts = options || {}

    opts.ctx = ctx
    opts.settings = this.WebSettings
    if (target instanceof Error) {
      opts.error = target
      if (!opts.status) opts.status = 500
    } else {
      opts.body = target
    }

    return this.NApp.response(opts)
  }

  $fail (ctx, err, options) {
    const opts = options || {}

    opts.settings = this.WebSettings
    opts.error = err
    if (!opts.status) opts.status = 500

    opts.ctx = ctx

    return this.NApp.response(opts)

    /* const that = this
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

    const settings = that.WebSettings || new Map()
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

    return Promise.resolve(null) */
  }

  $ok (ctx, body, options) {
    const opts = options || {}

    opts.settings = this.RouterSettings
    opts.body = body
    opts.ctx = ctx

    return this.NApp.response(opts)
  }

}

module.exports = SuperRouter
