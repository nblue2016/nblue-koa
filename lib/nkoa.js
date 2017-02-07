const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue-core')

const ApplicationManager = require('./middleware')
const RouterManager = require('./router')

const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

const DefaultHttpPort = 80
// const DefaultHttpsPort = 8080
const DefaultConfigFile = `${process.cwd()}/config.yml`

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

  get Schemas () {
    return this.getFromCache(KeysOfCache.Schemas)
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

  getObject (ctx, name) {
    if (!ctx) return null

    // assign this to that
    const that = this
    const key = that.getObjectKey(name)

    return ctx[key] ? ctx[key] : null
  }

  getObjectKey (name) {
    return `$${name}`
  }

  setObject (ctx, name, obj) {
    if (!ctx) return

    // assign this to that
    const that = this
    const key = that.getObjectKey(name)

    ctx[key] = obj
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
    if (!opts.configFile) opts.configFile = DefaultConfigFile

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
          if (logger) logger.verbose(`get instance of component: ${name}`)

          // call method of create for component
          yield aq.then(component.create(opts))

          // append to logger after create component
          if (logger) logger.verbose(`bind component: ${name}`)
        } catch (err) {
          // append to logger when create component failed
          if (logger) {
            logger.error(
              `bind component (${name}) failed, details: ${err.message}`
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
        if (logger) logger.verbose(`get instance of middleware: ${name}`)

        // call method of koa for component
        app.use(middleware.koa())

        // append to logger after bind middleware
        if (logger) logger.verbose(`bind middleware: ${name}`)
      } catch (err) {
        // append to logger when bind middleware failed
        if (logger) {
          logger.error(
            `bind middleware (${name}) failed, details: ${err.message}`
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
            logger.verbose(`created router (${name})`)
          }
        } catch (err) {
          if (logger) {
            logger.error(
              `create router (${name}) failed, details: ${err.message}`
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
    const config = that.Config
    const logger = that.Logger
    const settings = config.Settings

    // get web port from settings
    const port = settings && settings.has('port')
      ? settings.get('port', DefaultHttpPort)
      : DefaultHttpPort

    // write info to log
    if (logger) {
      logger.info(`start web services on ${port}`)
    }

    // we can choose http or https
    return http.
      createServer(app.callback()).
      listen(port)
  }

}

module.exports = nkoa
