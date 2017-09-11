    // use libraries
const events = require('events')
const http = require('http')
// const https = require('https')
const core = require('nblue-core')

const EventEmitter = events.EventEmitter
const ComponentManager = require('./components')
const ControllerManager = require('./controllers')
const Constants = require('./constants')

const aq = core.aq
const Betch = core.Betch
const co = core.co
const ConfigMap = core.ConfigMap
const Installer = require('./installer')

// assign console to C
// const C = console

// define constants
const SETTINGS_KEY_OF_BASE = 'base'

const SETTINGS_KEY_OF_HTTP_PORT = 80
const SETTINGS_KEY_OF_HTTPS_PORT = 443
const SETTINGS_KEY_OF_SUPPORTHTTPS = 'supportHttps'
const SETTINGS_KEY_OF_HANDLESIGNAL = 'handleSignal'

const DEFAULT_CONFIG_FILE = `${process.cwd()}/config.yml`

const DELAY_SECONDS_TO_EXIT = 0.1

const LOGGER_NAME = 'nblue'

const DefaultConfig = new Map()

const EnvMappings = {
  development: 'dev',
  testing: 'test',
  uat: 'uat',
  production: 'prod'
}

class Application extends EventEmitter {

  constructor (options) {
    // call super constructor
    super()

    // init variants
    this._startOpts = options || {}
    this._application = null
    this._server = null
    this._componentManager = new ComponentManager(this)
    this._controllerManager = new ControllerManager(this)

    // declare instance of map for caches
    this._globalCache = new Map()
    this._appCache = new Map()
  }

  // gets instance of nblue's application with alias
  // it is instnace of express, koa or koa2
  get Application () {
    return this._application
  }

  // gets instance of components manager
  get ComponentManager () {
    return this._componentManager
  }

  // gets instance of controllers manager
  get ControllerManager () {
    return this._controllerManager
  }

  // gets server type of nblue application
  // e.g. express, koa or koa2
  get ServerType () {
    // it have to set value for it in inherts class
    throw new Error('Please set ServerType')
  }

  get Server () {
    return this._server
  }

  // gets instance of global cache
  // the cache save global nblue objects like config, logger etc
  get GlobalCache () {
    return this._globalCache
  }

  // gets instance of application cache
  // the cache can save custom object by user
  get AppCache () {
    return this._appCache
  }

  // gets instance of config for nblue
  get Config () {
    return this.getFromCache(Constants.KeyOfConfig, DefaultConfig)
  }

  // gets instance of logger for nblue
  get Logger () {
    return this.getFromCache(Constants.KeyOfLogger)
  }

  getBaseFolder (settings) {
    // get base settings or use settings from root config
    const baseSettings = settings || this.Config.Settings

    // get setting value form settings or use process current work directory
    return baseSettings && baseSettings.has(SETTINGS_KEY_OF_BASE)
      ? baseSettings.get(SETTINGS_KEY_OF_BASE)
      : process.cwd()
  }

  getLogger (name) {
    // get instance of logger
    const logger = this.Logger

    // return null if there is no instance of logger
    if (!logger) return null

    // find log module by name
    return logger.module(name || LOGGER_NAME)
  }

  // get item from global cache by key
  getFromCache (key, defaultVal) {
    // get instance of cache
    const cache = this._globalCache

    // return value from cache by key
    return cache.has(key) ? cache.get(key) : defaultVal || null
  }

  // save item to global cache with key
  saveToCache (key, obj) {
    // get instance of cache
    const cache = this._globalCache

    // save value to cache by key
    cache.set(key, obj)
  }

  getEnvs () {
    // create new set
    const envs = new Set()
    const addEnv = (env) => envs.add(EnvMappings[env] ? EnvMappings[env] : env)

    // append node process env
    if (process.env.NODE_ENV) addEnv(process.env.NODE_ENV)

    // get argumetns from process
    const args = process.argv

    // parse arguments of envirnment
    if (args.includes('--debug')) addEnv('debug')
    if (args.includes('--release')) addEnv('release')

    // support arguments like --envs=dev,qa
    const cmdFlag = '--env='
    const cmdEnvs = args.find((val) => val.startsWith(cmdFlag))

    // parse envs in command line arguments
    if (cmdEnvs) {
      cmdEnvs.substring(cmdFlag.length).
        split(',').
        forEach((env) => addEnv(env))
    }

    // convert set to array and return it
    return Array.from(envs)
  }

  getPackages () {
    return []
  }

  install (config, options) {
    // assign options to opts
    const opts = options || {}

    if (!config) opts.config = config

    // create new set for packages
    const packageSet = new Set(this.getPackages())

    const gen = function *() {
      // call create method for every component
      let packages = yield this.applyComponents('getPackages', { config })

      // packages is an array of array of component packages
      packages.
        forEach(
          (cpackages) => cpackages.forEach(
            (pack) => packageSet.add(pack)
          )
        )

      // convert package set to array
      packages = Array.from(packageSet)

      if (packages.length > 0) {
        // create new instance of installer
        const installer = new Installer()

        // filter packages remove duplication
        packages = packages.
          filter((pack) => installer.filter(pack))

        if (packages.length > 0) {
          yield aq.then(installer.install(packages))

          return true
        }
      }

      return false
    }

    return co(gen.bind(this))
  }

  createConfig (options) {
    // assign options to opts
    const opts = options || {}

    // get array of envs
    const envs = this.getEnvs(opts)

    // define a generator function
    const gen = function *() {
      // parse options or config file with envs
      const config = opts.config
        ? opts.config
        : yield ConfigMap.parseConfig(
            opts.configFile || 'config.yml',
            envs
          )

      // get settings from configuration
      const settings = config.Settings

      // set current work directory as default base folder
      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      // append config to Betch
      Betch.config = config

      // save config to cache
      this.saveToCache(Constants.KeyOfConfig, config)

      // save settings to cache
      this.saveToCache(Constants.KeyOfSettings, settings)

      // return result
      return config
    }

    // return a Promise with generator function
    return co(gen.bind(this))
  }

  create (options) {
    const gen = function *() {
      // assign options to opts
      const opts = options || {}

      // set default config if can't find it in options
      if (!opts.configFile) opts.configFile = DEFAULT_CONFIG_FILE

      // prase instance of config with options
      const config = yield this.createConfig(opts)

      // install need packages by name
      if (opts.autoInstall) {
        // try to instll need packages
        yield this.install(config, opts)
      }

      // create instance of application
      this._application = opts.app ? opts.app : this.createInstance()

      // emit event for server created
      this.emit(Constants.EventOfServerCreate, this)

      // create components
      yield this.applyComponents('create', opts)

      // emit event for server initialized
      this.emit(Constants.EventOfServerInitializ, this)
    }

    // co a generator function
    return co(gen.bind(this))
  }

  /*
  @@ bind middlwares to nblue application
  */
  use () {
    // get instance of koa
    const app = this.Application

    // get function name for middleware by server type
    const mwFuncName = this.ServerType

    // co a generator function
    const gen = function *() {
      // create options for apply components
      const mwOpts = { key: 'middlewares' }

      // call koa method for every component
      const mws = yield this.applyComponents(mwFuncName, mwOpts)

      // fetch every middleware and use it
      mws.forEach((mw) => app.use(mw))

      this.emit(Constants.EventOfServerUse, this)
    }

    return co(gen.bind(this))
  }

  /*
  @@ bind controllers to request path
  */
  routes () {
    // get instance of role manager
    const ctmgr = this.ControllerManager

    // get instance of config map
    const config = this.Config

    // get instance of logger
    const logger = this.getLogger()

    // co a generator function to get a Promise
    const gen = function *() {
      // router manager parse routes config section
      yield ctmgr.parseControllersConfig(config.getArray('controllers'))

      // get controllers' config section by manager
      const controllersConfig = ctmgr.getControllersConfig()

      // fetch every config section from router manager
      for (const [name, configSection] of controllersConfig) {
        try {
          // create control and bind it to router by config section
          yield aq.then(ctmgr.createControllerByConfig(configSection))

          // append info to logger
          if (logger) {
            // generator details info for router config section
            // const detailsInfo =
            //  JSON.stringify(configSection.toObject(), null, 2)

            logger.info(`created router for controller (${name}) ok`)
            // logger.verbose(`config details:\r\n${detailsInfo}`)
          }
        } catch (err) {
          // append error to logger
          if (logger) {
            logger.error(`create router controller (${name}) failed`, err)
          }
        }
      }

      // emit event for bind routers
      this.emit(Constants.EventOfServerRoute, this)
    }

    return co(gen.bind(this))
  }

  listen () {
    // get instance of application
    const app = this.Application

    // get instance of logger
    const logger = this.getLogger()

    // get web port from settings
    const port = this.getServerPort()

    // handle signal
    this.handleSignal()

    // create instance of web server
    this._server = this.createServer(app)

    // emit event for server before start
    this.emit(Constants.EventOfServerBeforeStart, this)

    // listen defined server port
    this._server.listen(port)

    // emit event for server start
    this.emit(Constants.EventOfServerStart, this)

    // create info line for server start
    const startInfo = `start web services and listen on ${port}`

    // write info to log
    if (logger) logger.info(startInfo)

    // return a Promise
    return Promise.resolve()
  }

  handleSignal () {
    // get instance of settings from config
    const settings = this.Config.Settings

    // get flag of handle exit signal
    if (!settings.get(SETTINGS_KEY_OF_HANDLESIGNAL, true)) return

    // define error handle
    const errorHandler = (err) => err

    // define generator function to release components and events
    const gen = function *() {
      try {
        // release all components
        yield this.applyComponents('release')

        // remove event listeners
        process.removeListener('uncaughtException', errorHandler)
        process.removeListener('unhandledRejection', errorHandler)

        return this.exit()
      } catch (err) {
        return this.exit(1)
      }
    }

    // assign that to this
    const that = this

    // handle exit signal and release components
    Constants.
      SignalOfExit.
      forEach(
        (signal) => process.on(signal, () => co(gen.bind(that)))
      )

    // handle unkown exception on process
    process.on('unhandledRejection', errorHandler)
    process.on('uncaughtException', errorHandler)
  }

  start () {
    // get options for start
    const opts = this._startOpts || {}

    // create genrate function
    const gen = function *() {
      // create nblue application with options
      yield this.create(opts)

      // load defined middlewares
      yield this.use()

      // append defined routers
      yield this.routes()

      // listen port to start web server
      this.listen()
    }

    // execute gen function with this context
    return co(gen.bind(this))
  }

  stop () {
    // get instance of logger
    const logger = this.getLogger()

    const gen = function *() {
      // emit event before stop server
      this.emit(Constants.EventOfServerBeforeStop, this)

      // release all components
      yield this.applyComponents('release')

      if (this._server) {
        try {
          // try to stop current server
          this._server.close()

          // emit event stop server
          this.emit(Constants.EventOfServerStop, this)

          // append info to logger
          if (logger) {
            logger.info('The web server was closed')
          }
        } catch (err) {
          // append error to logger
          if (logger) {
            logger.error(`close web server failed`, err)
          }
        } finally {
          // release server variant
          this._server = null
        }
      }
    }

    // co a genrator function to a Promise
    return co(gen.bind(this))
  }

  exit (code) {
    // assign process to P
    const P = process

    // create generator function for exit
    const gen = function *() {
      // try to stop web server before exit
      yield this.stop()

      // emit end event
      this.emit(Constants.EventOfServerExit, this)

      // delay to exit and wait write entries to logger
      setTimeout(
        P.exit(code),
        DELAY_SECONDS_TO_EXIT * 1000
      )
    }

    return co(gen.bind(this))
  }

  applyComponents (method, options) {
    // assign options to opts
    const opts = options || {}

    // create a generator function
    const gen = function *() {
      // get instance of application manager
      const comgr = this.ComponentManager

      // get instance of config
      const config = opts.config || this.Config

      // get array of component configs by key from config
      const componentConfigs = config.getArray(opts.key || 'components')

      // define function to get component config section
      // from original config section
      const getCompSection = (section) => {
        if (typeof section === 'string') {
          return new Map().set('name', section)
        } else if (typeof section === 'object') return section

        return null
      }

      // get component items from config section
      const items =
        componentConfigs.
          map((section) => getCompSection(section)).
          filter((section) => section).
          map((section) => section.toObject()).
          filter((section) => section && section.name)

      // declare result
      const rts = []

      // fetch every component config item and invoke method for these
      for (const item of items) {
        // get name from config section
        const name = item.name

        // declare
        const compOpts = {}

        // assign section item to component options
        Object.assign(compOpts, item)

        // remove name property
        Reflect.deleteProperty(compOpts, 'name')

        // get component by name with options
        const component = comgr.getComponentByName(name, compOpts)

        // ignore invalid component or without method
        if (!component ||
            !component[method] ||
            typeof component[method] !== 'function') {
          continue
        }

        // process predefine arguments
        /* if (opts.args) {
          Object.keys(opts.args).
            forEach((argKey) => {
              const arg = opts.args[argKey]

              Object.
                keys(compOpts).
                forEach((key) => {
                  // get target key for argumenst mask
                  const targetKey = `\${${argKey}}`

                  // replace target value with argument value by key
                  if (compOpts[key].includes(targetKey)) {
                    compOpts[key] = compOpts[key].replace(targetKey, arg)
                  }
                })
            })
        } */

        try {
          // call method of create for component
          const rt = yield aq.then(component[method](compOpts))

          // ignore if get null value after invoke target method
          if (!rt) continue

          // push result to array
          rts.push(rt)

          // get instance of logger
          const logger = this.getLogger()

          // append to logger after create component
          if (logger) {
            logger.verbose(`component (${name}) apply ${method} ok`)
          }
        } catch (err) {
          // get instance of logger
          const logger = this.getLogger()

          // append to logger when create component failed
          if (logger) {
            logger.error(`${method} component (${name}) failed`, err)
          }
        }
      }

      // return result for all components
      return rts
    }

    return co(gen.bind(this))
  }

  respond (response) {
    // check for arguments
    if (!response) throw new ReferenceError('response')

    // get response status
    let status = response.status || 200

    // get response body and type
    const body = response.body || ''
    const type = response.type || 'json'

    // process empty body
    if (!body || body === '') {
      // set empty body to response
      this.set('content-length', 0)
      status = 204
    }

    // process response headers
    if (response.headers &&
        Object.keys(response.headers).length > 0) {
      for (const key of Object.keys(response.headers)) {
        this.set(key, response.headers[key])
      }
    }

    if (typeof this.sendStatus === 'function') {
      this.type(type)
      // output to response for express
      this.status(status).send(body)
    } else {
      // output to response for koa and koa2
      this.type = type
      this.status = status
      this.body = body
    }
  }

  // gets url of web server with http or https
  getServerUrl () {
    // get instance of settings from config
    const settings = this.Config.Settings

    // init default HTTP protoal
    let protocal = 'http'

    // if use HTTPs, change protocal to https
    if (settings.has(SETTINGS_KEY_OF_SUPPORTHTTPS)) {
      protocal =
        settings.get(SETTINGS_KEY_OF_SUPPORTHTTPS, false) ? 'https' : 'http'
    }

    // return full url of server
    return `${protocal}://localhost:${this.getServerPort()}`
  }

  // get port of web server
  getServerPort () {
    // get instance of settings from config
    const settings = this.Config.Settings

    // get default web port
    const defaultPort = settings.has(SETTINGS_KEY_OF_SUPPORTHTTPS)
      ? SETTINGS_KEY_OF_HTTPS_PORT
      : SETTINGS_KEY_OF_HTTP_PORT

    // get web port from settings
    return settings && settings.has('port')
      ? settings.get('port', defaultPort)
      : defaultPort
  }

  createServer (app) {
    return http.createServer(app)
  }

}

module.exports = Application
