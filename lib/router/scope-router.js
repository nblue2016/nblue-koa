const nblue = require('nblue-core')
const ModelRouter = require('./model-router.js')
const StringBuilder = nblue.StringBuilder

const modelName = 'scope'
// const contextName = `${modelName}`

class ScopeRouter extends ModelRouter
{

  // get data adapter by object name
  exec (methodFunc, options) {
    const that = this
    const opts = options || {}
    const mOk = that.$ok.bind(that)
    const mFail = that.$fail.bind(that)

    return function *() {
      const ctx = this

      // get instance of logger
      const logger = that.Logger

      // get context for current model
      const ctx$ = that.getItemContext(ctx, modelName)

      // exit if can't find context for current item
      if (!ctx$) return

      try {
        // get connections pool from context
        const conns = ctx$.conns

        // open database connection
        yield conns.open(modelName)

        try {
          // get data adapter by schema
          const dataAdpt = yield conns.getAdapter(modelName)

          // get result of apply method
          const rt = yield methodFunc(ctx, dataAdpt)

          // set correct response
          mOk(ctx, rt)
        } finally {
          // close database connection
          yield conns.close(modelName)
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply scope/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        // append error to log
        if (logger) logger.error(message, 'scope')

        // set message for current error
        err.message = message

        // set error response
        mFail(
          ctx,
          err, {
            name: 'scope',
            status: 500
          }
        )
      }
    }
  }

  // define method of model, show model schema by name
  mmodel () {
    const that = this
    const mOk = that.$ok.bind(that)

    return function *() {
      // get context for middleware
      const ctx = this

      // get context for current model
      const ctx$ = that.getItemContext(ctx, modelName)

      // exit if can't find context for current item
      if (!ctx$) return

      const schema = ctx$ ? ctx$.schema : {}

      yield mOk(ctx, schema ? schema.model : {})
    }
  }

}

module.exports = ScopeRouter
