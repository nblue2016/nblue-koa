const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue')
const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

const nconfig = require('./conf')
const nlogger = require('./middleware/logger')
const statics = require('./middleware/static')
const Scope = require('./middleware/scope')

const Hello = require('./middleware/hello')
const data = require('./middleware/data')

const RestAdapter = require('./router/rest-adapter')
const RestsAdapter = require('./router/rests-adapter')

class nkoa
{

  constructor (app) {
    this._app = app ? app : koa()
  }

  get App () {
    return this._app
  }

  get Context () {
    return this.App.context
  }

  create (configFile, options) {
    const app = this.App
    const ctx = this.Context
    const file = configFile ? configFile : `${process.cwd()}/config.yml`
    const opts = options || {}

    return co(function *() {
      const config = yield nconfig(file, opts)

      // get website settings
      const settings = config.get('settings')

      if (ctx) {
        ctx.config = config
        if (settings) ctx.settings = settings
      }

      Betch.config = config

      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      const logger =
        config.has('logger') ? nlogger.create(config, {}) : null

      if (ctx && logger) ctx.logger = logger

      const schemas =
        config.has('schemas') ? yield data.create(app) : null

      if (ctx && schemas) ctx.schemas = schemas

      return ctx
    })
  }

  listen () {
    const app = this.App
    const ctx = this.Context
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
    const app = this.App
    const ctx = this.Context
    const config = ctx.config
    const getFunc = this.getMiddleware.bind(this)

    const mws = config.get('middlewares')

    if (mws) {
      if (Array.isArray(mws)) {
        mws.forEach((mw) => app.use(getFunc(mw)))
      } else {
        app.use(getFunc(mws))
      }
    }
  }

  routes () {
    const app = this.App
    const ctx = this.Context
    const config = ctx.config ? ctx.config : new Map()
    const logger = ctx.logger ? ctx.logger : null

    const getAdapter = (name) => {
      switch (name.toLowerCase()) {
      case 'nblue-rest':
        return RestAdapter
      case 'nblue-rests':
        return RestsAdapter
      default:
        return require(name)
      }
    }

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
          const adapterName = routerConfigMap.get('adapter')

          // get class of router adapter by name
          const Adapter = getAdapter(adapterName)

          // create new instance of router adapter by config map
          const adapter = new Adapter(routerConfigMap)

          // bind router to application
          return adapter.bind(app)
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

  getMiddleware (name) {
    const app = this.App

    let md = null

    switch (name) {
    case 'nblue-logger':
      md = nlogger.koa
      break
    case 'nblue-static':
      md = statics.koa.bind(app, app)
      break
    case 'nblue-scope': {
      const scope = new Scope()

      md = scope.koa.bind(scope)
      break
    }
    case 'nblue-data':
      md = data.koa
      break
    case 'nblue-hello': {
      const hello = new Hello()

      md = hello.koa.bind(hello)
      break
    }
    default:
      break
    }

    if (md &&
      typeof md === 'function') {
      // return md.bind(app)()
      return md()
    }

    return null
  }

}

module.exports = nkoa
