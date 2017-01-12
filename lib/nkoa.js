const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue-core')
const ApplicationManager = require('./middleware')
// const Context = require('./context')

const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

const defaultHttpPort = 80
// const keyOfConfig = 'config'
const keyOfLogger = 'logger'
const keyOfSettings = 'settings'

class nkoa
{

  constructor (app) {
    this._application = app ? app : koa()
    this._applicationManager = new ApplicationManager(this)
    this._logger = null
    this._config = null
    this._schemas = null
  }

  get Application () {
    return this._application
  }

  get ApplicationManager () {
    return this._applicationManager
  }

  get Context () {
    try {
      return this.Application.context
    } catch (err) {
      return null
    }
  }

  get Config () {
    return this._config
  }
  set Config (val) {
    this._config = val
  }

  get Logger () {
    return this._logger
  }
  set Logger (val) {
    this._logger = val
  }

  get Schemas () {
    return this._schemas
  }
  set Schemas (val) {
    this._schemas = val
  }

  create (configFile, options) {
    // define using applications
    const ConfigApp = require('./middleware/app-conf')
    const LoggerApp = require('./middleware/app-logger')
    const DataApp = require('./middleware/app-data')

    const that = this

    return co(function *() {
      // get instance of Application
      const app = that.Application

      // get instance of context from application
      const ctx = that.Context

      // get config file name and options
      const file = configFile ? configFile : `${process.cwd()}/config.yml`
      const opts = options || {}

      // prase config file
      const config = yield ConfigApp.create(file, opts)

      // assing config to property
      that.Config = config

      // bind config to Betch
      Betch.config = config

      // get settings from configuration
      const settings = config.get('settings')

      // bind settings to context
      if (settings && ctx) ctx.settings = settings

      // set base folder in settings
      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      // create new instance of logger
      const logger =
        config.has(keyOfLogger)
          ? LoggerApp.create(config, {})
          : null

      // assign logger to property
      that.Logger = logger

      // handler application error
      app.on('error', (err) => {
        if (logger) {
          logger.error(`catched application error, details:${err.message}`)
        }
      })

      // get data schemas
      const schemas =
        config.has('schemas')
          ? yield DataApp.parseSchemas(that)
          : null

      that.Schemas = schemas

      return ctx
    })
  }

  use () {
    const that = this
    const app = that.Application
    const amgr = that.ApplicationManager

    that.Config.
      getArray('middlewares').
      forEach(
        (name) => app.use(amgr.getMiddleware(name))
      )
  }

  routes () {
    const that = this
    const config = that.Config
    const logger = that.Logger
    const settings = config.Settings

    const getRouter = (configFile) => {
      try {
        if (!configFile) {
          throw new Error(`can't find config by file:${configFile}`)
        }

        return co(function *() {
          // get base folder from config file or use current directory
          const base = config.has('base') ? config.get('base') : process.cwd()

          // parse full config name
          const routeConfigFile = `${base}/${configFile}`

          // create config map by file name
          const routerConfigMap = yield ConfigMap.parseConfig(routeConfigFile)

          // create empty map if router config hasn't settings
          if (!routerConfigMap.has(keyOfSettings)) {
            routerConfigMap.set(keyOfSettings, new Map())
          }

          // get settings from router config
          const routerSettings = routerConfigMap.get(keyOfSettings)

          // merge settings in global settings to router settings
          for (const [key, val] of settings) {
            if (routerSettings.has(key)) continue
            routerSettings.set(key, val)
          }

          // get the name of router adpater
          const routerName = routerConfigMap.get('name')

          // get class of router adapter by name
          const Router = that.getRouter(routerName)

          // set merged settings to router config
          routerConfigMap.set(keyOfSettings, routerSettings)

          // create new instance of router adapter by config map
          const router = new Router(that, routerConfigMap)

          // bind router to application
          return router.bind()
        })
      } catch (err) {
        // catch error
        const message = `create router failed, details: ${err.message}`

        if (logger) logger.error(message)

        return Promise.reject(err)
      }
    }

    // find defined routers from config file
    const routers = config.getArray('routes')

    routers.map(
      (name) => getRouter(name)
    )
  }

  listen () {
    // delcare
    const that = this
    const app = that.Application

    const config = that.Config
    const logger = that.Logger
    const settings = config.Settings

    // get web port from settings
    const port = settings
      ? settings.get('port', defaultHttpPort)
      : defaultHttpPort

    // write info to log
    if (logger) {
      logger.info(`start web services on ${port}`)
    }

    // we can choose http or https
    return http.
      createServer(app.callback()).
      listen(port)
  }

  getRouter (name) {
    const ModelsRouter = require('./router/models-router')
    const ScriptRouter = require('./router/script-router')
    const ScopeRouter = require('./router/scope-router')

    switch (name.toLowerCase()) {
    case 'models':
    case 'rest':
    case 'nblue-rest':
    case 'nblue-models':
      return ModelsRouter
    case 'script':
    case 'nblue-script':
      return ScriptRouter
    case 'scope':
    case 'nblue-scope':
      return ScopeRouter
    default:
      return require(name)
    }
  }

}

module.exports = nkoa
