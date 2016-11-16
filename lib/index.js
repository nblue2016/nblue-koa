const nblue = require('nblue')
const http = require('http')
// const https = require('https')
const nconfig = require('./conf')
const nhello = require('./middleware/hello')
const nlogger = require('./middleware/logger')
const nstatic = require('./middleware/static')

const co = nblue.co

const create = function (configFile, options) {
  const app = this

  return co(function *() {
    const config = yield nconfig(configFile, options)

      // get website settings
    const settings = config.get('settings')

    if (!settings.has('base')) {
      settings.set('base', process.cwd())
    }

    const logger =
        config.has('logger') ? nlogger.create(config, options) : null

    if (options.app) {
      // const app = options.app
      const ctx = app.context

      if (ctx) {
        ctx.config = config
        ctx.logger = logger
        ctx.settings = settings
      }
    }

    return {
      config,
      settings,
      logger
    }
  })
}

const createServer = (app) => {
  const ctx = app.context
  const settings = ctx.settings

  // we can choose http or https
  return http.
    createServer(app.callback()).
    listen(settings.get('port'))
}

const output = {}

output.name = 'nkoa'
output.configFile = `${process.cwd()}/config.yml`
output.create = create
output.createServer = createServer
output.hello = nhello
output.logger = nlogger.koa
output.static = nstatic

module.exports = output
