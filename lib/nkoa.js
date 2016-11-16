const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue')
const co = nblue.co

const nconfig = require('./conf')
const nlogger = require('./middleware/logger')
const nstatic = require('./middleware/static')
const nhello = require('./middleware/hello')

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
    const ctx = this.Context
    const file = configFile ? configFile : `${process.cwd()}/config.yml`
    const opts = options || {}

    return co(function *() {
      const config = yield nconfig(file, opts)

      // get website settings
      const settings = config.get('settings')

      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      const logger =
          config.has('logger') ? nlogger.create(config, {}) : null

      if (ctx) {
        ctx.config = config
        ctx.logger = logger
        ctx.settings = settings
      }

      return ctx
    })
  }

  listen () {
    const app = this.App
    const ctx = this.Context
    const settings = ctx.settings

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

  getMiddleware (name) {
    const app = this.App

    let md = null

    switch (name) {
    case 'nblue-logger':
      md = nlogger.koa.bind(app)
      break
    case 'nblue-static':
      md = nstatic.koa.bind(app)
      break
    case 'nblue-hello':
      md = nhello.koa.bind(app)
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
