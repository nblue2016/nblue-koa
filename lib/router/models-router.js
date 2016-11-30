const Router = require('koa-router')
const ModelRouter = require('./model-router.js')
const nblue = require('nblue')
const aq = nblue.aq

class ModelsRouter extends ModelRouter
{

  // create routers for all objects
  createRouter (config) {
    // declare
    const that = this
    const nkoa = that.Nkoa
    const app = nkoa.App
    const ctx = app.context
    const logger = ctx.logger
    const settings = config.has('settings')
      ? config.get('settings')
      : new Map()

    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    // append middlewares to current router
    that.superAppendApps(rootRouter)

    if (!ctx.schemas) {
      throw new Error('can\'t find schemas in context')
    }

    const schemas = ctx.schemas

    // bind models function to root router
    if (settings.has('showModels') &&
      settings.get('showModels') === true) {
      rootRouter.get('/models', that.getMethod({ method: 'models' }))
    }

    // remove prefix key for child routers
    if (config.has('prefix')) config.delete('prefix')

    // fetch every model in schema
    for (const model of schemas.Keys) {
      // create new instance of router options
      const routerOpts = {
        prefix: `/${model}`,
        model,
        settings
      }

      try {
        // create new instance of router for current model
        const router = super.createRouter(config, routerOpts)

        // bind current router to root
        rootRouter.use(router.routes(), router.allowedMethods())
      } catch (err) {
        if (logger) {
          logger.error(`create router failed, details: ${err.message}`)
        }
      }
    }

    // catch the methods that doesn't supported in adapter
    rootRouter.all('*', super.disable())

    // return rest router
    return rootRouter
  }

  appendApps () {
    return
  }

  superAppendApps (router) {
    super.appendApps(router)
  }

  superCreateRouter (config, options) {
    return super.createRouter(config, options)
  }

  // get middleware by object method name
  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''

    switch (method.toLowerCase()) {
    case 'models':
      return that.models()
    default:
      return super.getMethod(opts)
    }
  }

  // define method of models, show names for all models
  models () {
    return function *() {
      const ctx = this
      const schemas = ctx.schemas
      const keys = schemas.Keys

      ctx.type = 'json'
      ctx.body = keys.filter((key) => {
        const schema = schemas.getSchema(key)

        if (!schema) return false

        const smOpts = schema.options || {}

        if (smOpts.hidden) return false

        return true
      })

      yield aq.then(0)
    }
  }

}

module.exports = ModelsRouter
