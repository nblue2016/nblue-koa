// reference libraries
const core = require('nblue-core')

// use class
const Errors = require('./errors')
const ConfigMap = core.ConfigMap

// defien constant
const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_PREFIX = 'prefix'
const CONFIG_KEY_OF_ROUTES = 'routes'
const CONFIG_KEY_OF_MERGE_ROUTER = 'mergeRouter'

const DEFAULT_VALUE_OF_ROUTER_NAME = 'router'

class Controller {

  constructor (napp, config) {
    // check config
    if (!config) throw new ReferenceError('config')

    // set instance of nblue application
    this._napp = napp

    // try to get router name from config
    this._name = config.has(CONFIG_KEY_OF_ROUTER_NAME)
      ? config.get(CONFIG_KEY_OF_ROUTER_NAME)
      : DEFAULT_VALUE_OF_ROUTER_NAME

    // set instance of router config
    this._controllerConfig = config
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

  get ComponentManager () {
    return this.NApp.ComponentManager
  }

  get ControllerManager () {
    return this.NApp.ControllerManager
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

  get ControllerConfig () {
    return this._controllerConfig
  }

  get ControllerSettings () {
    return this.ControllerConfig.Settings
  }

  getAppByName (name) {
    const comgr = this.ComponentManager

    return comgr.getComponent(name)
  }

  getLogger () {
    // set module name for logger
    const moduleName = `controller_${this.Name}`

    // return instance of logger by module name
    return this.NApp.getLogger(moduleName)
  }

  bind () {
    // get instance of config for current controller
    const config = this.ControllerConfig

    // create new instance of router by config map
    const router = this.createRouter(config, {})

    // bind current contorler to router
    if (router) this.bindRouter(router)
  }

  createRouter (config, options) {
    // assign this to that
    const opts = options || {}
    const logger = this.getLogger()

    // set prefix for current router
    if (config.has(CONFIG_KEY_OF_PREFIX) && !opts.prefix) {
      opts.prefix = config.get(CONFIG_KEY_OF_PREFIX)
    }

    // create new instance of router with options
    const router = this.newRouter(opts)

    // use middlewares for current router
    if (opts.bindMiddlewares !== false) {
      this.bindMiddlewares(router)
    }

    // generate routes definition
    const routes = this.getRoutes(config, opts)

    // return null if there is no router defined
    if (!routes) return null

    // get method function by options
    const methodFunc = this.getMethod.bind(this)

    if (logger) {
      logger.verbose(`append routes to controller (${this.Name})`)
    }

    // fetch all web methods and mapped items
    for (const [reqMethod, items] of routes) {
      // fetch all path and mapped route method
      for (const [path, method] of items) {
        // get method name for current route
        const methodName = method || path

        // get full path of current router
        const fullpath = `${opts.prefix}${path}`

        // get full name for bind infomation
        const bindInfo =
          `bind [${methodName} => ` +
          `${reqMethod.toUpperCase()}::${fullpath}] to router`

        try {
          // bind method to path of router
          router[reqMethod](path, methodFunc(methodName, opts))

          // append info to logger
          if (logger) {
            logger.verbose(`${bindInfo} ok.`)
          }
        } catch (err) {
          // append error message to logger
          if (logger) {
            logger.error(`${bindInfo} failed.`, err)
          }

          continue
        }
      }
    }

    // return created router
    return router
  }

  newRouter (options) {
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

  bindMiddlewares (router, config) {
    // bind get application function
    const getAppByName = this.getAppByName.bind(this)

    // get config for current router
    const controllerConfig = config ? config : this.ControllerConfig

    // get middleware function name by server type
    const mwFunc = this.ServerType

    // bind every middleware to current router
    controllerConfig.
      getArray('middlewares').
      map((name) => getAppByName(name)).
      filter((app) => app).
      filter((app) => app[mwFunc] && typeof app[mwFunc] === 'function').
      map((app) => app[mwFunc]()).
      filter((mw) => mw).
      forEach((mw) => router.use(mw))
  }

  bindRouter (router, parent) {
    // exists if no instance of router
    if (!router) return

    // get instance of web application
    const app = parent ? parent : this.WebApplication

    // convert router to middlewares
    app.use(router.routes(), router.allowedMethods())
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
      const ctmgr = that.ControllerManager

      // get config by target router name
      const mergeConfig = ctmgr.ConfigMaps.get(mergeRouter)

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

  getMethod (method, options) {
    const opts = options || {}

    const methodFunc = this.getMethodByName(method)

    if (!methodFunc) {
      return this.disable()
    }

    return methodFunc(opts)
  }

  getSetting (key, defaultVal) {
    const settings = this.WebSettings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  getMethodByName (name) {
    let method = this[name]

    if (!method) {
      const methodName = ((type) => {
        switch (type) {
        case 'express':
          return `e${name}`
        case 'koa2':
          return `k2${name}`
        case 'koa':
        default:
          return `k${name}`
        }
      })(this.ServerType)

      method = this[methodName]
    }

    return method ? method.bind(this) : null
  }

  // define router method of disable, it will throw 403 error
  disable () {
    return this.generateResponse(Errors.DisabledError, { status: 403 })
  }

  // define router method of pass, it only show empty object
  pass () {
    return this.generateResponse({})
  }

  // define router method of pass, it only show empty message
  empty () {
    return this.generateResponse(null)
  }

  // define router method of test, it only used for test
  test () {
    return this.generateResponse({ test: 'ok' })
  }

  generateResponse (target, options) {
    // assign options to opts
    const opts = options || {}

    // set default value of status
    if (!opts.status) {
      opts.status = target instanceof Error ? 500 : 200
    }

    // get function of output context to response
    const outputToResponse = this.outputToResponse.bind(this)

    switch (this.ServerType) {
    case 'koa':
    default: {
      // return router middleware
      return function *() {
        // append context to options
        opts.ctx = this

        // output error message to resposne
        return yield outputToResponse(target, opts)
      }
    }
    }
  }

  outputToResponse (target, options) {
    const opts = options || {}

    opts.settings = this.ControllerSettings

    if (target instanceof Error) {
      opts.error = target
      if (!opts.status) opts.status = 500
    } else {
      opts.body = target
    }

    return this.NApp.respond(opts)
  }

}

module.exports = Controller
