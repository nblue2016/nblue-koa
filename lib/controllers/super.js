// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Component = require('./../components/super')
const Errors = require('./errors')
const aq = core.aq
const co = core.co
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

  get NApplication () {
    return this.NBlue.Application
  }

  get NConfig () {
    return this.NBlue.Config
  }

  get NSettings () {
    return this.NConfig.Settings
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

    const gen = function *() {
      // create new instance of router by config map
      const router = yield aq.then(this.createRouter(config, routerOpts))

      // bind current contorler to router
      return router
        ? this.appendRoutes(router, null, routerOpts)
        : null
    }

    return co(gen.bind(this))
  }

  createRouter (config, options) {
    // assign this to that
    const opts = options || {}
    const logger = this.getLogger()

    // create new instance of router with options
    const router = this.newRouter(opts)

    // get instance of nblue application
    const nblue = this.NBlue

    const gen = function *() {
      // use middlewares for current router
      if (opts.bindMiddlewares !== false) {
        yield this.bindMiddlewares(router, opts)
      }

      // generate routes definition
      const routes = this.getRoutes(config, opts)

      // return null if there is no router defined
      if (!routes) return null

      // create middleware function for router
      const createMWFunc = this.createRouterMD.bind(this)

      if (logger) {
        logger.verbose(`append routes to controller (${this.Name})`)
      }

      // fetch all web methods and mapped items
      for (const [reqMethod, items] of routes) {
        // ignore invalid items
        if (items === null) continue

        // fetch all path and mapped route method
        for (const [path, method] of items) {
          let
            methodName = null,
            section = null

          if (typeof method === 'string') {
            // get method name for current route
            methodName = method || path
          } else if (typeof method === 'object') {
            section = method.toObject()

            methodName = section.method || path
          }

          // get full path of current router
          const fullpath = `${opts.prefix}${path}`

          // get full name for bind infomation
          const bindInfo =
            `bind [${methodName} => ` +
            `${reqMethod.toUpperCase()}::${fullpath}] to router`

          try {
            // get instance of method for router
            const routerMW = createMWFunc(methodName, opts)

            if (section) {
              if (section.middlewares) {
                // get middleware function name by server type
                const mwFunc = ((type) => type)(this.ServerType)

                // create new opts
                const mwOpts = {
                  key: 'middlewares',
                  from: 'router'
                }

                // copy router options to middleware options
                Object.assign(mwOpts, opts)

                // set config of controller to options
                mwOpts.config = method

                // get middlewares for current route
                const mws = yield nblue.applyComponents(mwFunc, mwOpts)

                // fetch every method to router
                mws.forEach((mw) => router[reqMethod](path, mw))
              }
            }

            // bind method to path of router
            router[reqMethod](path, routerMW)

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

    return co(gen.bind(this))
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

  bindMiddlewares (router, options) {
    // assign options to opts
    const opts = options || {}

    // get config for current router
    const controllerConfig = opts.config ? opts.config : this.ControllerConfig

    const nblue = this.NBlue

    // get middleware function name by server type
    const mwFunc = ((type) => type)(this.ServerType)

    // create new opts
    const mwOpts = {
      key: 'middlewares',
      from: 'router'
    }

    // copy router options to middleware options
    Object.assign(mwOpts, opts)

    // set config of controller to options
    mwOpts.config = controllerConfig

    const gen = co(function *() {
      // get middlewares for current router
      const mws = yield nblue.applyComponents(mwFunc, mwOpts)

      // fetch every middleware and use it
      for (const mw of mws) {
        router.use(mw)
      }

      // return instance of router
      return router
    })

    return co(gen)
  }

  appendRoutes (router, parent, options) {
    // exists if no instance of router
    if (!router) return

    // assign options to opts
    const opts = options || {}

    // get instance of web application
    const app = parent ? parent : this.NApplication

    switch (this.ServerType) {
    case Constants.ServerOfExpress: {
      app.use(opts.prefix || '/', router)
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

  getMethod (methodName, options) {
    // assign options to opts
    const opts = options || {}

    // get method from options or null
    return opts.method ? opts.method : null
  }

  getSetting (key, defaultVal) {
    const settings = this.NSettings || new Map()

    return settings.has(key) ? settings.get(key) : defaultVal
  }

  createRouterMD (name, options) {
    // check for arguments
    if (!name) throw new ReferenceError('name')

    // assign options to opts
    const opts = options || {}

    // create middleware function for router
    const createMWFunc = Component.createMW.bind(this)

    // declare
    let method = null

    // use name as method if name is a function
    if (typeof name === 'function') {
      method = name
    }

    if (method === null) {
      method = this.getMethod(name, opts)
    }

    if (method === null) {
      const typeName = ((serverType) => {
        switch (serverType) {
        case 'express':
          return `e${name}`
        case 'koa':
          return `k${name}`
        case 'koa2':
          return `k2${name}`
        default:
          return null
        }
      })(this.Server)

      if (typeName && this[typeName]) {
        return this[typeName].bind(this)
      }
    }

    if (method === null) {
      method = this[name]
    }

    // const that = this
    const respondFunc = this.respond.bind(this)

    if (method !== null &&
        typeof method === 'function') {
      // append controller respond function to options
      opts.respond = function (response) {
        return respondFunc(this, response)
      }

      // append stop next flag to options
      opts.next = false

      return createMWFunc(method.bind(this), opts)
    }

    // return disabled function
    return createMWFunc(this.disable, opts)
  }


  respondBody (ctx, response) {
      // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!response) throw new ReferenceError('response')

      // format body from response
    response.body = ((body) => {
        // check body type
      if (body instanceof Error) {
          // create new object for error result
        const rt = {}

          // set properties to error result
        rt.message = body.message
        if (body.code) rt.code = body.code
        if (body.number) rt.number = body.number
        if (body.status) rt.status = body.status

          // return error json body
        return JSON.stringify(rt, null, 4)
      } else if (typeof body === 'string') {
          // return string body
        return body
      } else if (typeof body === 'object') {
          // return json body
        return JSON.stringify(body, null, 4)
      }

        // return other type bod to response
      return body.toString()
    })(response.body || response)
  }

  respondSettings (ctx, response) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!response) throw new ReferenceError('response')

    // define keys
    const SETTINGS_KEY_OF_RESPONSE = 'response'
    const SETTINGS_KEY_OF_RESPONSE_HEADERS = 'headers'
    const SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN = 'Access-Control-Allow-Origin'

    // get request from context
    const req = ctx.request

    // create array of configs
    const configs = [this.NConfig, this.ControllerConfig]

    // create new object for response header if it doesn't exist
    if (!response.headers) {
      response.headers = {}
    }

    configs.
      map((config) => config.Settings).
      map((settings) => {
        if (settings && settings.has(SETTINGS_KEY_OF_RESPONSE)) {
          return settings.get(SETTINGS_KEY_OF_RESPONSE).toObject()
        }

        return {}
      }).
      forEach((settings) => {
        const section = settings[SETTINGS_KEY_OF_RESPONSE_HEADERS] || {}

        if (section) {
          Object.
            keys(section).
            forEach((key) => {
              response.headers[key] = section[key]
            })
        }

        // set allow origin header by request
        const origin = req && req.headers ? req.headers.origin : ''

        // set value of header for 'Access-Control-Allow-Origin'
        if (section[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] &&
            section[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] !== '*') {
          // set origin value to header
          if (Array.isArray(settings.origins) &&
              settings.origins.includes(origin)) {
            response.headers[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] = origin
          } else if (settings.origins === origin) {
            response.headers[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] = origin
          }
        }
      })
  }

  respond (ctx, response) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!response) throw new ReferenceError('response')

    // get instance of nblue application
    const nblue = this.NBlue

    // bind context to respond function
    const respondFunc = nblue.respond.bind(ctx)

    // process body in response
    this.respondBody(ctx, response)

    // process settings that defined in config
    this.respondSettings(ctx, response)

    // invoke nblue respond function
    respondFunc(response)
  }

  // define controller method of disable, it will throw 403 error
  disable (ctx) {
    return ctx.respond({
      body: Errors.DisabledError,
      status: 403
    })
  }

  // define controller method of pass, it only show empty object
  pass (ctx) {
    return ctx.respond({})
  }

  // define controller method of pass, it only show empty message
  empty (ctx) {
    return ctx.respond(null)
  }

  // define controller method of test, it only used for test
  test (ctx) {
    return ctx.respond({ test: 'ok' })
  }

}

module.exports = Controller
