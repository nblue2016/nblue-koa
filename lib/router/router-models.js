const Router = require('koa-router')
const ModelRouter = require('./router-model.js')

class ModelsRouter extends ModelRouter
{

  // create routers for all objects
  createRouter (config) {
    // declare
    const that = this
    const logger = that.Logger

    // get s
    const settings = config.Settings

    // create options for router
    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    // append middlewares to current router
    that.superUse(rootRouter)

    // get schemas from context
    const schemas = that.Schemas

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
          logger.error(
            `create models router failed, details: ${err.message}`
          )
        }
      }
    }

    // catch the methods that doesn't supported in adapter
    rootRouter.all('*', super.mdisable())

    // return rest router
    return rootRouter
  }

  use () {
    return
  }

  superUse (router) {
    super.use(router)
  }

  superCreateRouter (config, options) {
    return super.createRouter(config, options)
  }

  // define method of models, show names for all models
  $models () {
    const that = this

    return function *() {
      // get schemas from context
      const ctx = this
      const schemas = that.Schemas

      // get models from schemas
      const models = schemas.
        Keys.
        filter((key) => {
          // get instance of schema by name
          const schema = schemas.getSchema(key)

          // ignore if can't find schema by name
          if (!schema) return false

          // get options for current schema
          const smOpts = schema.options || {}

          // ignore hidden schema, it disable to access by outerside
          return !smOpts.hidden
        })

      yield that.$ok(ctx, models)
    }
  }

}

module.exports = ModelsRouter
