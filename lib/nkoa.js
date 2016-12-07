const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue-core')
const Context = require('./context')

const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

const defaultHttpPort = 80

class nkoa
{

  constructor (app) {
    this._koaApp = app ? app : koa()
  }

  get KoaApp () {
    return this._koaApp
  }

  get Context () {
    try {
      return this.KoaApp.context
    } catch (err) {
      return null
    }
  }

  create (configFile, options) {
    // define using applications
    const ConfigApp = require('./middleware/conf-app')
    const LoggerApp = require('./middleware/logger-app')
    const DataApp = require('./middleware/data-app')

    const that = this

    return co(function *() {
      // get instance of Application
      const app = that.KoaApp

      // get instance of context from application
      const ctx = that.Context

      // get config file name and options
      const file = configFile ? configFile : `${process.cwd()}/config.yml`
      const opts = options || {}

      // prase config file
      const config = yield ConfigApp.create(file, opts)

      // bind config to context
      Context.setConfig(ctx, config)

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
        config.has('logger')
          ? LoggerApp.create(config, {})
          : null

      // bind logger to context
      Context.setLogger(ctx, logger)

      // handler application error
      app.on('error', (err) => {
        if (logger) {
          logger.error(`catched application error, details:${err.message}`)
        }
      })

      // get data schemas
      const schemas =
        config.has('schemas')
          ? yield DataApp.parseSchemas(app)
          : null

      // bind schemas to context
      Context.setSchemas(ctx, schemas)

      return ctx
    })
  }

  use () {
    const that = this
    const app = this.KoaApp
    const config = that.getConfig(app.context)

    const apps = config.getArray('middlewares')

    apps.forEach(
      (item) => app.use(Context.getApp(app, item))
    )
  }

  routes () {
    const that = this
    const config = that.getConfig()
    const logger = that.getLogger()
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
          if (!routerConfigMap.has('settings')) {
            routerConfigMap.set('settings', new Map())
          }

          // get settings from router config
          const routerSettings = routerConfigMap.get('settings')

          // merge settings in global settings to router settings
          for (const [key, val] of settings) {
            if (routerSettings.has(key)) continue
            routerSettings.set(key, val)
          }

          // get the name of router adpater
          const routerName = routerConfigMap.get('name')

          // get class of router adapter by name
          const Router = that.getRouter(routerName)

          // create new instance of router adapter by config map
          const router = new Router(that.KoaApp, routerConfigMap)

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

    aq.series(
      routers.map((item) => getRouter(item))
    )
  }

  listen () {
    // delcare
    const that = this
    const app = that.KoaApp
    // const settings = that.Settings
    const config = that.getConfig()
    const logger = that.getLogger()
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

  getConfig (ctx) {
    return Context.getConfig(ctx || this.Context)
  }

  getLogger (ctx) {
    return Context.getLogger(ctx || this.Context)
  }

}

module.exports = nkoa
