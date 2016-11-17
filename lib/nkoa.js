const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue')
const aq = nblue.aq
const co = nblue.co

const nconfig = require('./conf')
const nlogger = require('./middleware/logger')
const statics = require('./middleware/static')
const hello = require('./middleware/hello')
const data = require('./middleware/data')

const RestAdapter = require('./router/rest-adapter')
const RestsAdapter = require('./router/rests-adapter')

class nkoa
{

  constructor (app) {
    this._app = app ? app : koa()
    // this._ctx = app.context
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

      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      const logger =
        config.has('logger') ? nlogger.create(config, {}) : null

      if (ctx && logger) ctx.logger = logger

      const conns =
        config.has('connections') ? yield data.create(app) : null

      if (ctx && conns) ctx.conns = conns

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
    const config = ctx.config
    const logger = ctx.logger

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

    const getRouter = (item) => {
      try {
        const Adapter = getAdapter(item.adapter)
        const opts = {}

        opts.config = `${process.cwd()}/${item.config}`

        const adapter = new Adapter(opts)

        return adapter.bind(app)
      } catch (err) {
        const message = `create router failed, details: ${err.message}`

        if (logger) logger.error(message)

        return null
      }
    }


    if (config.has('routes')) {
      const rts = config.get('routes')

      aq.series(
        rts.map((item) => getRouter(item.toObject()))
      )
    }
  }

  getMiddleware (name) {
    const app = this.App

    let md = null

    switch (name) {
    case 'nblue-logger':
      md = nlogger.koa.bind(app)
      break
    case 'nblue-static':
      md = statics.koa.bind(app)
      break
    case 'nblue-data':
      md = data.koa.bind(app)
      break
    case 'nblue-hello':
      md = hello.koa.bind(app)
      break
    default:
      break
    }

    if (md &&
      typeof md === 'function') {
      return md()
    }

    return null
  }

}

module.exports = nkoa
