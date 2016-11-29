const nblue = require('nblue')
const ModelRouter = require('./model-router.js')
const StringBuilder = nblue.StringBuilder

class ScopeRouter extends ModelRouter
{

  getMethod (options) {
    // const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''

    switch (method.toLowerCase()) {
    default:
      return super.getMethod(opts)
    }
  }

  // get data adapter by object name
  getAdapter (method, options) {
    const that = this
    const opts = options || {}

    return function *() {
      const ctx = this
      const logger = ctx ? ctx.logger : null

      try {
        const model = 'scope'
        const ctx$ = ctx[`${model}$`]

        if (!ctx$) throw new Error(`can't find item context`)


        const conns = ctx$.conns

        yield conns.open(model)

        try {
          // get data adapter by schema
          const dataAdpt = yield conns.getAdapter(model)

          // get result of apply method
          const rt = yield method(ctx, dataAdpt)

          // apply method and set response body
          ctx.type = 'json'
          ctx.body = rt
        } finally {
          yield conns.close(model)
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply scope/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, 'scope')

        err.code = 500
        err.message = message

        // throw error
        that.throw(ctx, err, err.code)
      }
    }
  }

}

module.exports = ScopeRouter
