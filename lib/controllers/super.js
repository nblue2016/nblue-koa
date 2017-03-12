// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Errors = require('./errors')
const ConfigMap = core.ConfigMap

// defien constant
const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_PREFIX = 'prefix'
const CONFIG_KEY_OF_ROUTES = 'routes'
const CONFIG_KEY_OF_MERGE_ROUTER = 'mergeRouter'

const DEFAULT_VALUE_OF_ROUTER_NAME = 'router'

class Controller {

  constructor (nblue, config) {
    // check config
    if (!nblue) throw new ReferenceError('nblue')
    if (!config) throw new ReferenceError('config')

    // set instance of nblue application
    this._nblue = nblue

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

  get NBlue () {
    return this._nblue
  }

  get ServerType () {
    return this.NBlue.ServerType
  }

  get ComponentManager () {
    return this.NBlue.ComponentManager
  }

  get ControllerManager () {
    return this.NBlue.ControllerManager
  }

  get WebApplication () {
    return this.NBlue.Application
  }

  get WebConfig () {
    return this.NBlue.Config
  }

  get WebSettings () {
    return this.WebConfig.Settings
  }

  get Logger () {
    return this.NBlue.Logger
  }

  get ControllerConfig () {
    return this._controllerConfig
  }

  get ControllerSettings () {
    return this.ControllerConfig.Settings
  }

  getComponentByName (name) {
    const comgr = this.ComponentManager

    return comgr.getComponent(name)
  }

  getLogger () {
    // set module name for logger
    const moduleName = `controller_${this.Name}`

    // return instance of logger by module name
    return this.NBlue.getLogger(moduleName)
  }

  bind () {
    // get instance of config for current controller
    const config = this.ControllerConfig

    // create new opts for router
    const routerOpts = {}

    // generate options for router
    // set prefix for current router
    if (config.has(CONFIG_KEY_OF_PREFIX)) {
      routerOpts.prefix = config.get(CONFIG_KEY_OF_PREFIX)
    }

    // create new instance of router by config map
    const router = this.createRouter(config, routerOpts)

    // bind current contorler to router
    if (router) {
      this.bindRouter(router, null, routerOpts)
    }
  }

  createRouter (config, options) {
    // assign this to that
    const opts = options || {}
    const logger = this.getLogger()

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
          // get instance of method for router
          const routerMethod = methodFunc(methodName, opts)

          // bind method to path of router
          router[reqMethod](path, routerMethod)

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
      case Constants.ServerOfExpress: {
        const express = require('express')

        return express.Router
      }
      case Constants.ServerOfKoa:
      case Constants.ServerOfKoa2:
        return require('koa-router')
      default:
        return null
      }
    })()

    // return null if can't find class for Router
    if (!Router) return null

    // return new instance of Router
    return new Router(opts)
  }

  bindMiddlewares (router, config) {
    // get config for current router
    const controllerConfig = config ? config : this.ControllerConfig

    // get instance of logger
    const logger = this.getLogger()

    // get middleware function name by server type
    const mwFunc = ((type) => type)(this.ServerType)

    // bind every middleware to current router
    for (const name of controllerConfig.getArray('middlewares')) {
      // get instance of component by name
      const component = this.getComponentByName(name)

      // ignore if get component failed
      if (!component) {
        // append error to logger
        if (logger) {
          logger.error(`load component ${name} failed.`)
        }

        // ignore and continue to find next component
        continue
      }

      // check current component supports middleware for this server type
      if (component[mwFunc] && typeof component[mwFunc] === 'function') {
        try {
          // get middleware from component
          const mw = component[mwFunc]()

          // use middleware on current router
          router.use(mw)
        } catch (err) {
          // append error to logger
          if (logger) {
            logger.error(`bind middleware ${name} failed on router.`, err)
          }

          // continue to bind next middleware
          continue
        }
      }
    }
  }

  bindRouter (router, parent, options) {
    // exists if no instance of router
    if (!router) return

    // assign options to opts
    const opts = options || {}

    // get instance of web application
    const app = parent ? parent : this.WebApplication

    switch (this.ServerType) {
    case Constants.ServerOfExpress: {
      app.use(opts.prefix, router)
      break
    }
    case Constants.ServerOfKoa:
    case Constants.ServerOfKoa2: {
      // convert router to middlewares
      app.use(router.routes(), router.allowedMethods())
      break
    }
    default:
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
    // assign options to opts
    const opts = options || {}

    // get function for current method by name
    const methodFunc = this.getMethodByName(method)

    // use disable function as default if can't find it by name
    if (!methodFunc) {
      return this.disable()
    }

    try {
      // get target of method function
      const target = methodFunc(opts)

      if (typeof target === 'function') return target

      throw new Error('use native function')
    } catch (err) {
      return methodFunc
    }
  }

  getSetting (key, defaultVal) {
    const settings = this.WebSettings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  getMethodByName (name) {
    const methodName = ((type) => {
      switch (type) {
      case Constants.ServerOfExpress:
        return `e${name}`
      case Constants.ServerOfKoa2:
        return `k2${name}`
      case Constants.ServerOfKoa:
        return `k${name}`
      default:
        throw new Error('not support for current server.')
      }
    })(this.ServerType)

    let method = this[methodName]

    if (!method) {
      method = this[name]
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
    const sendToResponse = this.sendToResponse.bind(this)

    switch (this.ServerType) {
    case 'express': {
      // return router middleware
      return function (req, res) {
        // append context to options
        opts.req = req
        opts.res = res

        // output error message to resposne
        sendToResponse(target, opts)
      }
    }
    case 'koa':
    default: {
      // return router middleware
      return function *() {
        // append context to options
        opts.ctx = this

        // output error message to resposne
        return yield sendToResponse(target, opts)
      }
    }
    }
  }

  sendToResponse (target, options) {
    const opts = options || {}

    opts.settings = this.ControllerSettings

    if (target instanceof Error) {
      opts.error = target
    } else if (!opts.error) {
      opts.body = target
    }

    if (opts.error && !opts.status) opts.status = 500

    return this.NBlue.respond(opts)
  }

}

module.exports = Controller
