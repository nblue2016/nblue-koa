const nblue = require('nblue')

const Adapter = require('./adapter')
const mwJson = require('./../middleware/json')
const mwData = require('./../middleware/data')

const aq = nblue.aq
const betch = nblue.betch
// const betch$ = nblue.betch$
// const co = nblue.co
const StringBuilder = nblue.StringBuilder

class restsAdapter extends Adapter
{

  createRouter (app, config) {
    const ctx = app.context
    const logger = ctx.logger
    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const router = super.createRouter(app, config, opts)

    if (logger) logger.info('created rests router.')

    return router
  }

  appendMWs (router) {
    router.use(mwJson.koa())
    router.use(mwData.koa())
  }

  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''

    switch (method.toLowerCase()) {
    case 'test':
      return function *() {
        const ctx = this

        ctx.type = 'json'
        ctx.body = { test: 'ok' }

        yield aq.then(0)
      }
    case 'run':
      return that.mrun(opts)
    default:
      return super.getMethod(opts)
    }
  }

  mrun (options) {
    const opts = options || {}

    return function *() {
      const ctx = this
      const logger = ctx ? ctx.logger : null

      try {
        const conns = ctx.conns ? ctx.conns : null
        const getDbAdapter = (name) => conns.getAdapter(name)

        yield conns.openAll()

        try {
          // get result of apply method
          // use %2f for / if the script under sub-folder
          const params = {
            script: ctx.params.script,
            args: ctx.query
          }

          const context = {}

          context.conns = conns

          context.$fullReturn = true

          // bind functions to context
          context.getDbAdapter = getDbAdapter

          const rt = yield betch(params, context)

          // apply method and set response body
          ctx.type = 'json'
          ctx.body = rt

          yield aq.then(0)
        } finally {
          yield conns.closeAll()
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply ${opts.model}/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, 'rest')

        err.code = 500
        err.message = message

        mwJson.throw(ctx, err, 500)
      }
    }
  }


}

module.exports = restsAdapter
