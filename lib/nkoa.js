const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue-core')
const ApplicationManager = require('./middleware')
const RouterManager = require('./router')

const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch

const defaultHttpPort = 80

class nkoa
{

  constructor (app) {
    // assign koa application and manager to self
    this._application = app ? app : koa()
    this._applicationManager = new ApplicationManager(this)
    this._routerManager = new RouterManager(this)

    this._boxes = new Map()

    // declare variants
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

  get Boxes () {
    return this._boxes
  }

  get Config () {
    return this._config
  }

  get Logger () {
    return this._logger
  }

  get Schemas () {
    return this._schemas
  }

  get Keys () {
    return {
      Config: 'config',
      Settings: 'settings',
      Logger: 'logger',
      Connections: 'conns'
    }
  }

  create (configFile, options) {
    // define using applications
    const ConfigApp = require('./middleware/app-conf')
    const LoggerApp = require('./middleware/app-logger')
    const DataApp = require('./middleware/app-data')

    // assign this to that
    const that = this

    // get defined keys
    const keys = that.Keys

    // get instance of Application
    const app = that.Application

    return co(function *() {
      // get config file name and options
      const file = configFile ? configFile : `${process.cwd()}/config.yml`
      const opts = options || {}

      // prase config file
      const config = yield ConfigApp.create(file, opts)

      // get settings from configuration
      const settings = config.get(keys.Settings)

      // set base folder in settings
      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      // create new instance of logger
      const logger =
        config.has(keys.Logger)
          ? LoggerApp.create(config, {})
          : null

      // get data schemas
      const schemas =
        config.has('schemas')
          ? yield DataApp.parseSchemas(
              that, {
                config,
                logger
              })
          : null

      return {
        config,
        logger,
        schemas
      }
    }).
    then((data) => that.init(data)).
    then(() => {
      const logger = that.Logger

      // handler application error
      app.on('error', (err) => {
        if (logger) {
          logger.error(`catched application error, details:${err.message}`)
        }
      })
    })
  }

  init (options) {
    const opts = options || {}

    if (opts.config) {
      this._config = opts.config
      Betch.config = opts.config
    }

    if (opts.logger) {
      this._logger = opts.logger
    }

    if (opts.schemas) {
      this._schemas = opts.schemas
    }
  }

  use () {
    const that = this
    const app = that.Application
    const amgr = that.ApplicationManager
    const config = that.Config
    const logger = that.Logger

    return aq.series(
      config.
        getArray('middlewares').
        forEach(
          (name) => {
            try {
              const mw = amgr.getMiddleware(name)

              if (logger) logger.verbose(`get instance of middleware: ${name}`)

              app.use(mw)

              if (logger) logger.verbose(`bind middleware: ${name}`)
            } catch (err) {
              if (logger) {
                logger.error(
                `bind middleware (${name}) failed, details: ${err.message}`
                )
              }
            }
          })
        )
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

}

module.exports = nkoa
