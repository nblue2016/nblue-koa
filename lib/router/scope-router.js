const nblue = require('nblue-core')
const aq = nblue.aq
const ModelRouter = require('./model-router.js')
const StringBuilder = nblue.StringBuilder

const modelName = 'scope'
const contextName = `${modelName}$`

class ScopeRouter extends ModelRouter
{

  // get data adapter by object name
  exec (methodFunc, options) {
    const that = this
    const opts = options || {}

    return function *() {
      const ctx = this
      const logger = that.getLogger(ctx)

      try {
        const ctx$ = ctx[contextName]

        if (!ctx$) throw new Error(`can't find item context`)

        const conns = ctx$.conns

        yield conns.open(modelName)

        try {
          // get data adapter by schema
          const dataAdpt = yield conns.getAdapter(modelName)

          // get result of apply method
          const rt = yield methodFunc(ctx, dataAdpt)

          that.$ok(ctx, rt)
        } finally {
          yield conns.close(modelName)
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply scope/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, 'scope')

        err.message = message

        // throw error
        that.$fail(ctx, err, { status: 500 })
      }
    }
  }

  // define method of model, show model schema by name
  mmodel () {
    const that = this

    return function *() {
      const ctx = this
      const ctx$ = ctx[contextName]
      const schema = ctx$ ? ctx$.schema : {}

      yield that.$ok(ctx, schema ? schema.model : {})
    }
  }

}

module.exports = ScopeRouter
