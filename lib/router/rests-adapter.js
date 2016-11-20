const nblue = require('nblue')

const Adapter = require('./adapter')
const mwJson = require('./../middleware/json')
const mwData = require('./../middleware/data')

const aq = nblue.aq
const betch$ = nblue.betch$
const StringBuilder = nblue.StringBuilder

class restsAdapter extends Adapter
{

  appendMWs (router) {
    router.use(mwJson.koa())
    router.use(mwData.koa())
  }

  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''

    switch (method.toLowerCase()) {
    case 'test':
      return function *() {
        const ctx = this

        ctx.type = 'json'
        ctx.body = { test: 'ok' }

        yield aq.then(0)
      }
    case 'run':
      return that.mrun(opts)
    default:
      return super.getMethod(opts)
    }
  }

  mrun (options) {
    const opts = options || {}
    // define a function to get real script file by request
    const getScript = (file) => {
      const routeCfg = opts.config ? opts.config : new Map()
      const base = routeCfg.has('base')
        ? routeCfg.get('base')
        : process.cwd()

      return `${base}/${file}.js`
    }

    return function *() {
      const ctx = this

      // set some variants only used in betch$
      const config = ctx ? ctx.config : null
      const logger = ctx ? ctx.logger : null
      const schemas = ctx ? ctx.schemas : null

      try {
        const conns = ctx.conns ? ctx.conns : null
        const getDbAdapter = (name) => conns.getAdapter(name)

        yield conns.openAll()

        try {
          // declare context, it is context for betch nor used for koa
          const ctx$ = {}

          // get result of apply method
          // use %2f for / if the script under sub-folder
          const params = {
            script: getScript(ctx.params.script),
            args: ctx.query
          }

          // assign some variants to context
          ctx$.conns = conns

          // init arguments for context
          ctx$.$fullReturn = true
          ctx$.$args = params.args

          if (config) ctx$.config = config
          if (schemas) ctx$.schemas = schemas

          // bind functions to context
          ctx$.getDbAdapter = getDbAdapter
          ctx$.rest = aq.rest

          yield betch$(params.script, ctx$).
            then((data) => {
              ctx.type = 'json'
              ctx.body = data
            }).
            catch((err) => mwJson.throw(err))

          yield aq.then(0)
        } finally {
          yield conns.closeAll()
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply ${opts.model}/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, 'rest')

        err.code = 500
        err.message = message

        mwJson.throw(ctx, err, 500)
      }
    }
  }


}

module.exports = restsAdapter
