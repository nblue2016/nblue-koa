const Router = require('koa-router')
const ModelRouter = require('./model-router.js')

class ModelsRouter extends ModelRouter
{

  // create routers for all objects
  createRouter (config) {
    // declare
    const that = this
    const app = that.App
    const ctx = app.context
    const logger = that.getLogger(ctx)

    // get s
    const settings = config.Settings

    // create options for router
    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    // append middlewares to current router
    that.superAppendApps(rootRouter)

    // get schemas from context
    const schemas = that.getSchemas(ctx)

    if (!schemas) {
      throw new Error('can\'t find schemas in context')
    }

    // bind models function to root router
    if (settings.get('showModels', false) === true) {
      rootRouter.get('/models', that.$models())
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
    rootRouter.all('*', super.$disable())

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

  // define method of models, show names for all models
  $models () {
    const that = this

    return function *() {
      const ctx = this
      const schemas = that.getSchemas(ctx)
      const keys = schemas.Keys

      ctx.type = 'json'
      ctx.body = keys.filter((key) => {
        // get instance of schema by name
        const schema = schemas.getSchema(key)

        // ignore if can't find schema by name
        if (!schema) return false

        // get options for current schema
        const smOpts = schema.options || {}

        // ignore hidden schema, it disable to access by outerside
        if (smOpts.hidden) return false

        return true
      })

      yield Promise.resolve(null)
    }
  }

}

module.exports = ModelsRouter
