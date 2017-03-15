// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./model.js')
const co = core.co

// define constant
const CONFIG_KEY_OF_PREFIX = 'prefix'

class ModelsController extends Contorler {

  // create routers for all objects
  createRouter (config) {
    // get instance of looger
    const logger = this.getLogger()

    // get instance of data application
    const dt = this.getComponentByName('data')

    // get settings from current config
    const settings = config.Settings

    // define function to create router by super class
    const superCreateRouter = super.createRouter.bind(this)

    // define function to disable by super class
    const superDisable = super.disable.bind(this)

    const gen = function *() {
      // create options for router
      const opts = {}

      // check config value by prefix
      if (config.has(CONFIG_KEY_OF_PREFIX)) {
        opts.prefix = config.get(CONFIG_KEY_OF_PREFIX)
      }

      // create root router with options
      const rootRouter = this.newRouter(opts)

      // append middlewares to current router
      yield this.bindMiddlewares(rootRouter)

      // get schemas from context
      const schemas = dt ? dt.Schemas : null

      if (!schemas) {
        throw new Error('can\'t find schemas in context')
      }

      // bind models function to root router
      if (settings.get('showModels', false) === true) {
        rootRouter.get('/models', this.models())
      }

      // remove prefix key for child routers
      if (config.has(CONFIG_KEY_OF_PREFIX)) {
        config.delete(CONFIG_KEY_OF_PREFIX)
      }

      // fetch every model in schema
      for (const model of schemas.Keys) {
        // create new instance of router options
        const routerOpts = {
          prefix: `/${model}`,
          bindMiddlewares: false,
          model,
          settings
        }

        try {
          // create new instance of router for current model
          const router = yield superCreateRouter(config, routerOpts)

          // bind current router to root
          this.appendRoutes(router, rootRouter, routerOpts)
        } catch (err) {
          if (logger) {
            logger.error('create models router failed', err)
          }
        }
      }

      // catch the methods that doesn't supported in adapter
      rootRouter.all('*', superDisable())

      // return rest router
      return rootRouter
    }

    return co(gen.bind(this))
  }

  // define method of models, show names for all models
  models () {
    // get instance of data application
    const dt = this.getComponentByName('data')

    // get schemas from data application
    const schemas = dt.Schemas

    // get entity name from schemas
    const names = schemas.Keys

    // get model list by names
    const models = names.
      map((name) => schemas.getSchema(name)).
      filter((schema) => schema).
      filter((schema) => !schema.options || schema.options.hidden !== true).
      map((schema) => schema.name)

    // output models to response
    return this.generateResponse(models || {})
  }

}

module.exports = ModelsController
