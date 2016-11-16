const Adapter = require('./adapter')
const Router = require('koa-router')

class restAdapter extends Adapter
{

  constructor (options) {
    super(options)

    this._test = 'ok'
  }

  createRouter (app, config) {
    const ctx = app.context
    const logger = ctx.logger
    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    const conns = ctx.conns

    if (!conns) return null

    const schemas = conns.Schemas
    // remove prefix key for child routers

    if (config.has('prefix')) config.delete('prefix')
    for (const modelName of schemas.Cache.keys()) {
      const router = super.createRouter(
        app, config, {
          prefix: `/${modelName}`,
          model: modelName
        }
      )

      try {
        rootRouter.use(router.routes(), router.allowedMethods())
      } catch (err) {
        if (logger) {
          logger.err(`create router failed, details: ${err.message}`)
        }
      }
    }

    return rootRouter
  }

  getMethod (options) {
    const opts = options || {}

    return function *(next) {
      const ctx = this

      console.log(opts)
      console.log(ctx.params)

      ctx.body = {
        model: opts.model,
        method: opts.method
      }
      ctx.type = 'json'

      yield next
    }
  }

}

module.exports = restAdapter
