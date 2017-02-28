// reference libraries
const http = require('http')
// const https = require('https')
const koa = require('koa')
const core = require('nblue-core')

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
const SETTINGS_KEY_OF_HANDLEEXIT = 'handleExit'

const DEFAULT_CONFIG_FILE = `${process.cwd()}/config.yml`

const LOGGER_NAME = 'nkoa'

const P = process

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

        // parse envs from applciation
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
    // assign this to that
    const that = this

    // parse options and find config file name
    const opts = options || {}

    // co a generator function
    return co(function *() {
      // set default config if can't find it in options
      if (!opts.configFile) opts.configFile = DEFAULT_CONFIG_FILE

      // prase instance of config with options
      yield that.createConfig(opts)

      // call create method for every component
      return yield that.callComponents('create', opts)
    })
  }

  use () {
    // assign this to that
    const that = this

    // get instance of koa
    const app = that.Application

    // co a generator function
    return co(function *() {
      // call koa method for every component
      const mws = yield that.callComponents('koa')

      // fetch every middleware
      mws.forEach((mw) => app.use(mw))

      // return a Promise
      return Promise.resolve()
    })
  }

  routes () {
    // assign this to that
    const that = this

    // get instance of role manager
    const ctmgr = that.ControllerManager

    // get instance of config map
    const config = that.Config

    // get instance of logger
    const logger = that.getLogger()

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
            logger.verbose(`created router for ${name} ok`)
          }
        } catch (err) {
          if (logger) {
            logger.error(`create router (${name}) failed`, err)
          }
        }
      }

      // return a promise
      return Promise.resolve()
    })
  }

  listen () {
    // assign this to that
    const that = this

    // get instance of koa application
    const app = that.Application

    // get instance of logger
    const logger = that.getLogger()

    // get web port from settings
    const port = this.getServerPort()

    // write info to log
    if (logger) {
      logger.info(`start web services on ${port}`)
    }

    // we can choose http or https
    const server = http.createServer(app.callback())

    // get instance of settings from config
    const settings = this.Config.Settings

    // get flag of handle exit signal
    const handleExit = settings.get(SETTINGS_KEY_OF_HANDLEEXIT, true)

    // define error handle
    const errorHandler = (err) => {
      if (logger) {
        logger.error('unknown error', err)
      }
    }

    // handle exit signal and release components
    if (handleExit) {
      ExitSignal.forEach(
        (signal) =>
          process.on(
            signal,
            () => co(function *() {
              // release all components
              yield that.callComponents('release')

              // remove event listeners
              process.removeListener('uncaughtException', errorHandler)
              process.removeListener('unhandledRejection', errorHandler)
            }).
            then(() => P.exit()).
            catch(() => P.exit(1))
          )
      )
    }

    // handle unkown exception on process
    process.on('unhandledRejection', errorHandler)
    process.on('uncaughtException', errorHandler)

    // listen defined server port
    return server.listen(port)
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

  callComponents (method, options) {
    // assign this to that
    const that = this

    // assign options to opts
    const opts = options || {}

    // get instance of application manager
    const comgr = that.ComponentManager

    // get instance of config
    const config = that.Config

    // get instance of Logger, maybe logger app wasn't created
    const logger = that.getLogger()

    // co a generator function
    return co(function *() {
      // declare result
      const rts = []

      // fetch components that defined in config file
      for (const name of config.getArray('components')) {
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

          if (rt) rts.push(rt)

          // append to logger after create component
          if (logger) {
            logger.verbose(`${method} component ok`, {
              name: rt.Name
            })
          }
        } catch (err) {
          // append to logger when create component failed
          if (logger) {
            logger.error(`${method} component failed`, err)
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
