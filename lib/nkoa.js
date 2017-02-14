const http = require('http')
// const https = require('https')
const koa = require('koa')
const core = require('nblue-core')

const ApplicationManager = require('./middleware')
const RouterManager = require('./router')

const aq = core.aq
const co = core.co
const Betch = core.Betch
const ConfigMap = core.ConfigMap

const NAPPLICATION_SERVER_TYPE = 'koa'

const SETTINGS_KEY_OF_HTTP_PORT = 80
const SETTINGS_KEY_OF_HTTPS_PORT = 443
const SETTINGS_KEY_OF_SUPPORTHTTPS = 'supportHttps'

const DEFAULT_CONFIG_FILE = `${process.cwd()}/config.yml`

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

class nkoa
{

  constructor (app) {
    // assign koa application and manager to self
    this._application = app ? app : koa()
    this._applicationManager = new ApplicationManager(this)
    this._routerManager = new RouterManager(this)

    // declare instance of map for caches
    this._globalCache = new Map()
    this._appCache = new Map()
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

  get ApplicationManager () {
    return this._applicationManager
  }

  get RouterManager () {
    return this._routerManager
  }

  get Context () {
    try {
      return this.Application.context
    } catch (err) {
      return null
    }
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

    // set default config if can't find it in options
    if (!opts.configFile) opts.configFile = DEFAULT_CONFIG_FILE

    // get instance of application manager
    const amgr = that.ApplicationManager

    return co(function *() {
      // prase instance of config with options
      yield that.createConfig(opts)

      // fetch components that defined in config file
      for (const name of that.Config.getArray('components')) {
        // get component by name
        const component = amgr.getApplication(name)

        // ignore invalid component
        if (!component) continue

        // check component has creaet method or not
        if (!component.create ||
          typeof component.create !== 'function') continue

        // get instance of Logger, maybe logger app wasn't created
        const logger = that.Logger

        try {
          // append to logger before create component
          if (logger) {
            logger.verbose(`get instance of component: ${name}`, LOGGER_NAME)
          }

          // call method of create for component
          yield aq.then(component.create(opts))

          // append to logger after create component
          if (logger) logger.verbose(`bind component: ${name}`, LOGGER_NAME)
        } catch (err) {
          // append to logger when create component failed
          if (logger) {
            logger.error(
              `bind component (${name}) failed, details: ${err.message}`,
              LOGGER_NAME
            )
          }
        }
      }
    })
  }

  use () {
    // assign this to that
    const that = this

    // get instance of koa
    const app = that.Application

    // get instance of application manager
    const amgr = that.ApplicationManager

    // get instance of logger
    const logger = that.Logger

    for (const name of that.Config.getArray('middlewares')) {
      // get middleware by name
      const middleware = amgr.getApplication(name)

      // ignore invalid middle
      if (!middleware) continue

      // check middleware has koa method or not
      if (!middleware.koa || typeof middleware.koa !== 'function') continue

      try {
        // append to logger before bind middleware
        if (logger) {
          logger.verbose(`get instance of middleware: ${name}`, LOGGER_NAME)
        }

        // call method of koa for component
        app.use(middleware.koa())

        // append to logger after bind middleware
        if (logger) logger.verbose(`bind middleware: ${name}`, LOGGER_NAME)
      } catch (err) {
        // append to logger when bind middleware failed
        if (logger) {
          logger.error(
            `bind middleware (${name}) failed, details: ${err.message}`,
            LOGGER_NAME
          )
        }
      }
    }

    return Promise.resolve(0)
  }

  routes () {
    const that = this
    const rmgr = that.RouterManager
    const config = that.Config
    const logger = that.Logger

    return co(function *() {
      yield rmgr.parseConfigs(config.getArray('routes'))

      const configMaps = rmgr.ConfigMaps

      for (const [name, configMap] of configMaps) {
        try {
          rmgr.createRouter(configMap)

          if (logger) {
            logger.verbose(`created router (${name})`, LOGGER_NAME)
          }
        } catch (err) {
          if (logger) {
            logger.error(
              `create router (${name}) failed, details: ${err.message}`,
              LOGGER_NAME
            )
          }
        }
      }

      return Promise.resolve(0)
    })
  }

  listen () {
    // assign this to that
    const that = this

    // declare
    const app = that.Application
    const logger = that.Logger

    // get web port from settings
    const port = this.getServerPort()

    // write info to log
    if (logger) {
      logger.info(`start web services on ${port}`, LOGGER_NAME)
    }

    // we can choose http or https
    return http.
      createServer(app.callback()).
      listen(port)
  }

  response (options) {
    // get instance of application manager
    const amgr = this.ApplicationManager

    // assign options to opts
    const opts = options || {}

    // get context of application
    const ctx = options.ctx ? options.ctx : this.Context

    // get type of response
    const responseType = 'json'

    // response result by type
    switch (responseType) {
    // case 'xml':
    case 'json':
    default:
      return amgr.
        getApplication('json').
        responseKoa(ctx, opts)
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
