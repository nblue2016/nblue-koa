// reference libraries
const http = require('http')
// const https = require('https')
const core = require('nblue-core')
const koa = require('./install').koa

// use classes
const ComponentManager = require('./components')
const ControllerManager = require('./controllers')

const aq = core.aq
const co = core.co
const Betch = core.Betch
const ConfigMap = core.ConfigMap

// define constrants
const NAPPLICATION_SERVER_TYPE = 'koa'

const SETTINGS_KEY_OF_BASE = 'base'

const SETTINGS_KEY_OF_HTTP_PORT = 80
const SETTINGS_KEY_OF_HTTPS_PORT = 443
const SETTINGS_KEY_OF_SUPPORTHTTPS = 'supportHttps'
const SETTINGS_KEY_OF_HANDLESIGNAL = 'handleSignal'

const DEFAULT_CONFIG_FILE = `${process.cwd()}/config.yml`

const DELAY_SECONDS_TO_EXIT = 0.1

const LOGGER_NAME = 'nkoa'

const DefaultConfig = new Map()

const KeysOfCache = {
  Config: 'config',
  Settings: 'settings',
  Logger: 'logger',
  Schemas: 'schemas',
  Connections: 'conns'
}

const EnvMappings = {
  development: 'dev',
  testing: 'test',
  uat: 'uat',
  production: 'prod'
}

const ExitSignal = ['SIGINT', 'SIGUSR2']

class nkoa {

  constructor (app) {
    // assign koa application and manager to self
    this._application = app ? app : koa()
    this._componentManager = new ComponentManager(this)
    this._controllerManager = new ControllerManager(this)

    // declare instance of map for caches
    this._globalCache = new Map()
    this._appCache = new Map()

    this.Name = 'logger'
  }

  get ServerType () {
    return NAPPLICATION_SERVER_TYPE
  }

  get Koa () {
    return this._application
  }

  get Application () {
    return this._application
  }

  get ComponentManager () {
    return this._componentManager
  }

  get ControllerManager () {
    return this._controllerManager
  }

  get GlobalCache () {
    return this._globalCache
  }

  get AppCache () {
    return this._appCache
  }

  get Config () {
    return this.getFromCache(KeysOfCache.Config, DefaultConfig)
  }

  get Logger () {
    return this.getFromCache(KeysOfCache.Logger)
  }

  get Keys () {
    return KeysOfCache
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

  getFromCache (key, defaultVal) {
    const cache = this._globalCache

    return cache.has(key) ? cache.get(key) : defaultVal || null
  }

  saveToCache (key, obj) {
    this._globalCache.set(key, obj)
  }

  createConfig (options) {
    const opts = options || {}
    const getEnvs = () => {
      const app = opts ? opts.app : null

      const envs = []

      // append envirnment name to array
      const appendEnv = (env) => {
        if (!env) return

        const name = EnvMappings[env] ? EnvMappings[env] : env

        if (!envs.includes(name)) {
          envs.push(name)
        }
      }

      // use NODE_ENV as default
      if (process.env.NODE_ENV) {
        appendEnv(process.env.NODE_ENV)
      } else {
        const args = process.argv

        // parse envs from application
        if (app && app.env) {
          if (Array.isArray(app.env)) {
            app.env.
              forEach((appEnv) => appendEnv(appEnv))
          } else {
            appendEnv(app.env)
          }
        }

        // parse arguments of envirnment
        if (args.includes('--debug')) appendEnv('debug')
        if (args.includes('--release')) appendEnv('release')

        // support arguments like --envs=dev,qa
        const envsArg = '--env='

        args.
          filter((val) => val.startsWith(envsArg)).
          forEach((val) => {
            const index = val.indexOf(envsArg)
            const env = val.substring(index + envsArg.length)

            if (env.indexOf(',' < 0)) appendEnv(env)
            else {
              env.
                split(',', -1).
                forEach((item) => appendEnv(item.trim()))
            }
          })
      }

      return envs
    }

    const that = this

    const envs = opts.envs ? opts.envs : getEnvs()
    const configFile = opts.configFile || 'config.yml'

    return co(function *() {
      return yield !envs || Array.isArray(envs) && envs.length === 0
            ? ConfigMap.parseConfig(configFile)
            : ConfigMap.parseConfig(configFile, envs)
    }).
    then((config) => {
      // get settings from configuration
      const settings = config.get(KeysOfCache.Settings)

      // set base folder in settings
      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      Betch.config = config

      that.saveToCache(KeysOfCache.Config, config)

      return config
    })
  }

  create (options) {
    // parse options and find config file name
    const opts = options || {}

    // define function to create config
    const createFunc = this.createConfig.bind(this)

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // co a generator function
    return co(function *() {
      // set default config if can't find it in options
      if (!opts.configFile) opts.configFile = DEFAULT_CONFIG_FILE

      // prase instance of config with options
      yield createFunc(opts)

      // call create method for every component
      yield applyFunc('create', opts)

      // return a Promise
      return Promise.resolve()
    })
  }

  use () {
    // get instance of koa
    const app = this.Application

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // co a generator function
    return co(function *() {
      // call koa method for every component
      const mws = yield applyFunc('koa', { key: 'middlewares' })

      // fetch every middleware
      mws.forEach((mw) => app.use(mw))

      // return a Promise
      return Promise.resolve()
    })
  }

  routes () {
    // get instance of role manager
    const ctmgr = this.ControllerManager

    // get instance of config map
    const config = this.Config

    // get instance of logger
    const logger = this.getLogger()

    return co(function *() {
      // router manager parse routes config section
      yield ctmgr.parseConfigs(config.getArray('routes'))

      // fetch every config from router manager
      for (const [name, configMap] of ctmgr.getControllerConfigs()) {
        try {
          // create control and bind it to router by config map
          ctmgr.createControllerByMap(configMap)

          // append to info to logger
          if (logger) {
            logger.verbose(`created router for controller (${name}) ok`)
          }
        } catch (err) {
          if (logger) {
            logger.error(`create router controller (${name}) failed`, err)
          }
        }
      }

      // return a promise
      return Promise.resolve()
    })
  }

  listen () {
    // get instance of koa application
    const app = this.Application

    // get instance of logger
    const logger = this.getLogger()

    // get web port from settings
    const port = this.getServerPort()

    // handle signal
    this.handleSignal()

    // we can choose http or https
    // create instance of web server
    const server = http.createServer(app.callback())

    // listen defined server port
    server.listen(port)

    const startInfo = `create web services on ${port}`

    // write info to log
    if (logger) {
      logger.info(startInfo)
    }

    // assign console to C
    const C = console

    // output start info to console
    C.log(startInfo)

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

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // define generator function to release components and events
    const gen = function *() {
      // release all components
      yield applyFunc('release')

      // remove event listeners
      process.removeListener('uncaughtException', errorHandler)
      process.removeListener('unhandledRejection', errorHandler)
    }

    const exitFunc = this.exit.bind(this)

    // handle exit signal and release components
    ExitSignal.forEach(
      (signal) =>
        process.on(
          signal,
          () => co(gen).
            then(() => exitFunc()).
            catch(() => exitFunc(1))
        )
    )

    // handle unkown exception on process
    process.on('unhandledRejection', errorHandler)
    process.on('uncaughtException', errorHandler)
  }

  start (options) {
    // create genrate function
    const gen = function *() {
      // create nblue application with options
      yield this.create(options)

      // load defined middlewares
      yield this.use()

      // append defined routers
      yield this.routes()

      // listen port to start web server
      this.listen()
    }

    // execute gen function with this context
    co(gen.bind(this))
  }

  exit (code) {
    // assign process to P
    const P = process

    // delay to exit and wait write entries to logger
    setTimeout(() => P.exit(code), DELAY_SECONDS_TO_EXIT * 1000)
  }

  applyComponents (method, options) {
    // assign options to opts
    const opts = options || {}

    // get instance of application manager
    const comgr = this.ComponentManager

    // get instance of config
    const config = this.Config

    // get instance of Logger, maybe logger app wasn't created
    const getLoggerFunc = this.getLogger.bind(this)

    // co a generator function
    return co(function *() {
      // declare result
      const rts = []

      // fetch components that defined in config file
      for (const name of config.getArray(opts.key || 'components')) {
        let componentName = null

        if (typeof name === 'string') componentName = name
        else if (name instanceof Map) {
          componentName = name.has('name') ? name.get('name') : null
        }

        // ignore if can't found component name
        if (!componentName) continue

        // get component by name
        const component = comgr.getComponent(name)

        // ignore invalid component or without method
        if (!component ||
            !component[method] ||
            typeof component[method] !== 'function') {
          continue
        }

        try {
          // call method of create for component
          const rt = yield aq.then(component[method](opts || {}))

          // push result to array
          if (rt) rts.push(rt)

          const logger = getLoggerFunc()

          // append to logger after create component
          if (logger) {
            logger.verbose(`component (${componentName}) apply ${method} ok`)
          }
        } catch (err) {
          const logger = getLoggerFunc()

          // append to logger when create component failed
          if (logger) {
            logger.error(`${method} component (${componentName}) failed`, err)
          }
        }
      }

      return rts
    })
  }

  respond (options) {
    // get instance of application manager
    const comgr = this.ComponentManager

    // assign options to opts
    const opts = options || {}

    // get type of response
    const responseType = 'json'

    // response result by type
    switch (responseType) {
    // case 'xml':
    case 'json':
    default:
      return comgr.
        getComponent('json').
        krespond(opts)
    }
  }

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

}

module.exports = nkoa
