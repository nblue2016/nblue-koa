const nblue = require('nblue')
const Router = require('koa-router')
const mwJson = require('./../middleware/json')
const aq = nblue.aq
const ConfigMap = nblue.ConfigMap

class Adapter {

  constructor (options) {
    const opts = options || {}

    this._config = opts.config || new Map()
  }

  bind (app) {
    const that = this

    return ConfigMap.
      parseConfig(this._config).
      then((config) => {
        const router = that.createRouter(app, config, {})

        if (router) {
          app.use(router.routes(), router.allowedMethods())
        }
      })
  }

  createRouter (app, config, options) {
    const that = this
    // const ctx = app.context
    const opts = options || {}

    if (config.has('prefix') && !opts.prefix) {
      opts.prefix = config.get('prefix')
    }

    const router = new Router(opts)

    if (config.has('methods')) {
      // get methods defined in config file
      const methods = config.get('methods')

      // fetch all web methods and mapped items
      for (const [webMethod, items] of methods) {
        // fetch all path and mapped adapter method
        for (const [path, adapterMethod] of items) {
          // get method function and bind context

          const opts2 = {}

          Object.assign(opts2, opts)
          opts2.method = adapterMethod
          opts2.path = path

          const method = that.getMethod.bind(that, opts2)

          // bind method to router
          router[webMethod](path, method())
        }
      }
    }

    return router
  }

  getMethod (options) {
    const that = this
    const opts = options || {}

    const method = opts.method ? opts.method : 'disabled'

    switch (method.toLowerCase()) {
    case 'disable':
      return that.disable()
    default:
      return function *(next) {
        const ctx = this

        ctx.body = { method: opts.method }
        ctx.type = 'json'

        yield next
      }
    }
  }

  disable () {
    return function *() {
      const ctx = this

      const err = new Error()

      err.code = 403
      err.message = 'disabled'

      mwJson.throw(ctx, err, 403)

      yield aq.then(0)
    }
  }

}

module.exports = Adapter
