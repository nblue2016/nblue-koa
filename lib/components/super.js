// reference libraries
const fs = require('fs')
const path = require('path')
const core = require('nblue-core')

// use libraries
const Constants = require('.././constants')

// use classes
const aq = core.aq
const betch = core.betch
const co = core.co

const ConfigMap = core.ConfigMap

// define constants
const DEFAULT_COMPONENT_NAME = 'unknown'

class Component {

  // define constructor function
  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // set instance of nblue application
    this._nblue = nblue

    // init variants
    this.initialize(opts)
  }

  // the static will create middle ware for all server type
  // it will call middlware method in instance to implement a middlware
  // that supports all web server includes express, koa and koa2.
  // the method of middlware same as koa use ctx as the first argument
  // for express it will bind req and res to ctx. we can use it like below
  // const { request, response } = ctx
  static createMW (mw, options) {
    // check for arguments
    if (!mw) return null

    // assign options to opts
    const opts = options || {}

    // declare variants
    const nblue = this.NBlue
    const instance = this

    // get respond function from options or nblue
    const respond = opts.respond ? opts.respond : nblue.respond

    const goNext = opts.next !== false

    // create opts for creating middleware
    const mwOpts = { instance, nblue }

    // assign opts to mwOpts
    Object.assign(mwOpts, opts)

    switch (this.ServerType) {
    case Constants.ServerOfExpress:
      return function (req, res, next) {
        // create context for express with request and response
        const ctx = {
          request: req,
          response: res
        }

        // bind response to respond function
        if (respond) {
          ctx.respond = respond.bind(res)
        }

        // bind context to create middleware function
        const mwFunc = mw.bind(instance)

        // invoke function to create a middleware
        return aq.then(mwFunc(ctx, mwOpts)).
          then(() => {
            if (mwOpts.callback) {
              // catch event once for session end
              nblue.once(Constants.EventOfSessionEnd, mwOpts.callback)

              // remove callback function from middleware options
              Reflect.deleteProperty(mwOpts, 'callback')
            }

            // pass next middlewares
            return goNext ? next() : null
          })
      }
    case Constants.ServerOfKoa:
      return function *(next) {
        // get context for current
        const ctx = this

        // bind response to respond function
        if (respond) {
          ctx.respond = respond.bind(ctx)
        }

        // bind context to create middleware function
        const mwFunc = mw.bind(instance)

        // invoke function to create a middleware
        yield aq.then(mwFunc(ctx, mwOpts))

        // pass next middlewares
        if (goNext) yield next

        // check callback function exists or not
        if (mwOpts.callback) {
          // inoke callback function
          yield aq.then(mwOpts.callback())

          // remove callback function from middleware options
          Reflect.deleteProperty(mwOpts, 'callback')
        }

        return null
      }
    case Constants.ServerOfKoa2:
      return function (ctx, next) {
        // bind response to respond function
        if (respond) {
          ctx.respond = respond.bind(ctx)
        }

        // bind context to create middleware function
        const mwFunc = mw.bind(instance)

        // invoke function to create a middleware
        return aq.then(mwFunc(ctx, mwOpts)).
            then(() => aq.then(goNext ? next() : null).
              then(() => {
                // check callback function exists or not
                if (mwOpts.callback) {
                  // invoke callback function if it exists
                  aq.then(mwOpts.callback()).
                    then(() => {
                      // remove callback function from middleware options
                      Reflect.deleteProperty(mwOpts, 'callback')
                    })
                }
              })
            )
      }

    default:
      throw new Error('not support')
    }
  }

  // gets or sets the name of component
  get Name () {
    return this._name
  }
  set Name (val) {
    this._name = val
  }

  // gets instance of nblue
  get NBlue () {
    return this._nblue
  }

  // get instance of nblue, it is a simple name
  get N () {
    return this._nblue
  }

  // gets instance of application manager
  get ComponentManager () {
    return this.N.ComponentManager
  }

  // gets server type of nblue application
  // e.g. express, koa or koa2
  get ServerType () {
    return this.N.ServerType
  }

  // gets instance of nblue's application with alias
  // it is instnace of express, koa or koa2
  get Application () {
    return this.N.Application
  }

  // gets instance of config for application
  get AppConfig () {
    return this.N.Config
  }

  // gets instance of settings for application
  get AppSettings () {
    return this.AppConfig.Settings
  }

  // get instance of config for current component
  get Config () {
    return this._config
  }

  // get instance of settings for current component
  get Settings () {
    return this.Config.Settings
  }

  // this function will initialize variant before call create
  initialize (options) {
    // assign options to opts
    const opts = options || {}

    // set name of current component
    this._name = opts.name || DEFAULT_COMPONENT_NAME

    // create new instance of config
    this._config = new ConfigMap()
  }

  // the funciton only call once when application start
  create (options) {
    // get options from arguments
    const opts = options || {}

    // create generator function
    const gen = function *() {
      // create instance of config for current component
      this._config = yield this.createConfig(opts)

      // invoke _create method, it should implement by inherits class
      if (this._create &&
          typeof this._create === 'function') {
        yield aq.then(this._create(opts))
      }

      // return an empty promise
      return yield Promise.resolve()
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  createConfig (options) {
    // assign optiosn to opts
    const opts = options || {}

    // get name of component
    const name = this.Name

    // get instance of nblue
    const nblue = this.NBlue

    // get base folder for current component
    const baseFolder = opts.base || nblue.getBaseFolder()

    // get instance of application config
    const appConfig = this.AppConfig

    // create set for current component configs
    const items = new Set()

    // try to find config file or applicatin config section by component name
    if (name) {
      // try to parse config file by component name
      items.add(`${name}.yml`)

      // get config section from application config
      if (appConfig.has(name)) {
        // get config section by name
        const section = appConfig.get(name)

        // append section to items
        items.add(section)
      }
    }

    // try to get config from options
    if (opts.config) items.add(opts.config)

    // create generator function to parse config
    const gen = function *() {
      // convert items in config definitions
      const ary = Array.
                    from(items).
                    filter((config) => config).
                    map((config) => {
                      if (typeof config === 'object') return config
                      else if (typeof config === 'string') {
                        // get config file for current component
                        const configFile = path.join(baseFolder, config)

                        // if exists config file, parse it
                        if (fs.existsSync(configFile)) {
                          return ConfigMap.parseConfig(configFile)
                        }
                      }

                      return null
                    })

      // betch config items
      const configs = yield betch(ary)

      // create new instance for current component
      const cconfig = new ConfigMap()

      // merge sub config to component config
      configs.
        filter((config) => config).
        forEach((config) => cconfig.merge(config))

      // return component config
      return cconfig
    }

    // co a generator method
    return co(gen.bind(this))
  }

  // the function only call once when application stop
  release (options) {
    // assign options to opts
    const opts = options || {}

    // define generator function
    const gen = function *() {
      // invoke _release method, it should implement by inherits class
      if (this._release &&
          typeof this._release === 'function') {
        yield aq.then(this._release(opts))
      }

      // get instance of logger
      const logger = this.getLogger()

      // append release info to logger
      if (logger) {
        logger.verbose(`The component(${this.Name}) was released`)
      }
    }

    // co a generator method
    return co(gen.bind(this))
  }

  // create a middleware base on current server type
  createEmptyMW () {
    switch (this.ServerType) {
    case Constants.ServerOfExpress:
      return (req, res, next) => next()
    case Constants.ServerOfKoa2:
      return (ctx, next) => next()
    case Constants.ServerOfKoa:
    default:
      return function *(next) {
        return yield next
      }
    }
  }

  // the function will return middleware for express
  express () {
    // same as koa server
    return this.koa()
  }

  // the function will return middleware for koa
  koa () {
    // generate function for create middleware
    const createFunc = Component.createMW.bind(this)

    // invoke create function
    return createFunc(this.middleware)
  }

  // the function will return middleware for koa
  koa2 () {
    // same as koa server
    return this.koa()
  }

  // the function will implement a middleware for all server type
  middleware (ctx, options) {
    const opts = options || {}

    return Promise.resolve(opts)
  }

  // return a registered component by name
  getComponentByName (name) {
    // get instance of application manager
    const comgr = this.ComponentManager

    // get application by name
    return comgr.getComponent(name)
  }

  // get instance of logger from nblue by module name
  getLogger (name) {
    // set module name for logger
    const moduleName = `component_${name || this.Name}`

    // get instance of nblue
    const nblue = this.N

    // return instance of logger by module name
    return nblue.getLogger(moduleName)
  }

  // get a section from config by key
  getConfigSection (config, key) {
      // check for arguments
    if (!config) throw new ReferenceError('config')
    if (!key) throw new ReferenceError('key')

      // check database section in config
    return config.has(key)
        ? config.get(key)
        : new ConfigMap()
  }

}

module.exports = Component
