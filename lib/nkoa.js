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
const HelloApp = require('./middleware/hello-app')
const DataApp = require('./middleware/data-app')

class nkoa
{

  constructor (app) {
    this._app = app ? app : koa()
  }

  get App () {
    return this._app
  }

  create (configFile, options) {
    const that = this

    return co(function *() {
      // get instance of Application
      const app = that.App

      // get instance of context from application
      const ctx = app.context

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
          ? yield DataApp.parseSchemas(ctx)
          : null

      // bind schemas to context
      if (schemas && ctx) ctx.schemas = schemas

      return ctx
    })
  }

  listen () {
    const app = this.App
    const ctx = app.context
    const settings = ctx.settings

    const logger = ctx.logger

    if (logger) {
      logger.info(`start web services on ${settings.get('port')}`)
    }

    // we can choose http or https
    return http.
      createServer(app.callback()).
      listen(settings.get('port'))
  }

  use () {
    const that = this
    const app = that.App
    const ctx = app.context
    const config = ctx.config

    const mws = config.get('middlewares')

    if (mws) {
      if (Array.isArray(mws)) {
        mws.forEach((mw) => app.use(that.getApp(mw)))
      } else {
        app.use(that.getApp(mws))
      }
    }
  }

  routes () {
    const that = this
    const app = that.App
    const ctx = app.context
    const config = ctx.config ? ctx.config : new Map()
    const logger = ctx.logger ? ctx.logger : null

    const getRouter = (configFile) => {
      try {
        if (!configFile) {
          throw new Error(`can't find config by file:${config}`)
        }

        return co(function *() {
          // get base folder from config file or use current directory
          const base = config.has('base') ? config.get('base') : process.cwd()

          // parse full config name
          const fullConfigFile = `${base}/${configFile}`

          // create config map by file name
          const routerConfigMap = yield ConfigMap.parseConfig(fullConfigFile)

          // get instance of global config
          const globalConfig = ctx.config ? ctx.config : new Map()

          // get settings from global config
          const globalSettings = globalConfig.has('settings')
            ? globalConfig.get('settings')
            : new Map()

          // create empty map if router config hasn't settings
          if (!routerConfigMap.has('settings')) {
            routerConfigMap.set('settings', new Map())
          }

          // get settings from router config
          const routerSettings = routerConfigMap.get('settings')

          // merge settings in global settings to router settings
          for (const [key, val] of globalSettings.entries()) {
            if (routerSettings.has(key)) continue
            routerSettings.set(key, val)
          }

          // get the name of router adpater
          const adapterName = routerConfigMap.get('name')

          // get class of router adapter by name
          const Adapter = that.getRouter(adapterName)

          // create new instance of router adapter by config map
          const adapter = new Adapter(that, routerConfigMap)

          // bind router to application
          return adapter.bind()
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
      aq.series(
        config.
          get('routes').
          map((item) => getRouter(item))
      )
    }
  }

  getApp (name) {
    const that = this
    const app = that.App

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
    case 'data':
    case 'nblue-data':
      return new DataApp().koa(that)
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
