const nblue = require('nblue-core')
const ModelRouter = require('./router-model.js')
const StringBuilder = nblue.StringBuilder

const modelName = 'scope'

class ScopeRouter extends ModelRouter
{

  createRouter (config, options) {
    const opts = options || {}

    opts.model = modelName

    return super.createRouter(config, opts)
  }

  // get data adapter by object name
  /*
  exec (methodFunc, options) {
    // assign this to that
    const that = this

    const nkoa = that.Nkoa
    const logger = that.Logger
    const keys = nkoa.Keys

    const opts = options || {}
    const mOk = that.$ok.bind(that)
    const mFail = that.$fail.bind(that)

    return function *() {
      const ctx = this
      const conns = nkoa.getObject(ctx, keys.Connections)

      try {
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
  */

  // define method of model, show model schema by name
  mmodel () {
    const that = this
    const schemas = that.Schemas
    const mOk = that.$ok.bind(that)

    return function *() {
      // get context
      const ctx = this
      const schema = schemas.getSchema(modelName)

      yield mOk(ctx, schema ? schema.model : {})
    }
  }

}

module.exports = ScopeRouter
