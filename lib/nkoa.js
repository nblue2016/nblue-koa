const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue')

const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

// define using applications
const ConfigApp = require('./middleware/conf-app')
const LoggerApp = require('./middleware/logger-app')
const StaticApp = require('./middleware/static-app')
const ScopeApp = require('./middleware/scope-app')
const JsonApp = require('./middleware/json-app')
const FormApp = require('./middleware/form-app')
const HelloApp = require('./middleware/hello-app')
const DataApp = require('./middleware/data-app')

const defaultHttpPort = 80

class nkoa
{

  constructor (app) {
    this._app = app ? app : koa()
  }

  get App () {
    return this._app
  }

  get Context () {
    try {
      return this.App.context
    } catch (err) {
      return null
    }
  }

  get Config () {
    try {
      return this.Context.config
    } catch (err) {
      return null
    }
  }

  get Logger () {
    try {
      return this.Context.logger
    } catch (err) {
      return null
    }
  }

  get Settings () {
    try {
      return this.Config.Settings
    } catch (err) {
      return null
    }
  }

  create (configFile, options) {
    const that = this

    return co(function *() {
      // get instance of Application
      const app = that.App

      // get instance of context from application
      const ctx = that.Context

      // get config file name and options
      const file = configFile ? configFile : `${process.cwd()}/config.yml`
      const opts = options || {}

      // prase config file
      const config = yield ConfigApp.create(file, opts)

      // bind config to context
      if (config && ctx) ctx.config = config

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
      if (logger && ctx) ctx.logger = logger

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
      if (schemas && ctx) ctx.schemas = schemas

      return ctx
    })
  }

  listen () {
    // delcare
    const that = this
    const app = that.App
    const settings = that.Settings
    const logger = that.Logger

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

  use () {
    const that = this
    const app = that.App
    const config = that.Config

    const items = config.get('middlewares')
    const apps = Array.isArray(items) ? items : [items]

    apps.forEach((item) => app.use(that.getApp(item)))
  }

  routes () {
    const that = this
    const config = that.Config || new Map()
    const logger = that.Logger

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
          for (const [key, val] of that.Settings) {
            if (routerSettings.has(key)) continue
            routerSettings.set(key, val)
          }

          // get the name of router adpater
          const routerName = routerConfigMap.get('name')

          // get class of router adapter by name
          const Router = that.getRouter(routerName)

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
    if (config.has('routes')) {
      aq.series(config.
          get('routes').
          map((item) => getRouter(item)))
    }
  }

  getApp (name) {
    const app = this.App

    switch (name) {
    case 'logger':
    case 'nblue-logger':
      return new LoggerApp().koa()
    case 'static':
    case 'nblue-static':
      return new StaticApp(app).koa()
    case 'scope':
    case 'nblue-scope':
      return new ScopeApp(app).koa()
    case 'json':
    case 'nblue-json':
      return new JsonApp().koa()
    case 'form':
    case 'nblue-form':
      return new FormApp().koa()
    case 'data':
    case 'nblue-data':
      return new DataApp().koa()
    case 'hello':
    case 'nblue-hello':
      return new HelloApp().koa()
    default:
      throw new Error(`not support middleware (${name})`)
    }
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
