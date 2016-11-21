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
    case 'run':
      return that.mrun(opts)
    default:
      return super.getMethod(opts)
    }
  }

  mrun (options) {
    const that = this
    const opts = options || {}
    // define a function to get real script file by request
    const getScript = (file) => {
      const routeCfg = opts.config ? opts.config : new Map()
      const base = routeCfg.has('base')
        ? routeCfg.get('base')
        : process.cwd()

      return `${base}/${file}.js`
    }

    const parseContext = function (ctx) {
      // set some variants only used in betch$
      const config = ctx ? ctx.config : null
      const conns = ctx.conns ? ctx.conns : null
      const logger = ctx ? ctx.logger : null
      const schemas = ctx ? ctx.schemas : null

      // create betch context
      const rt = {}

      // bind some variants and function to betch context
      if (config) rt.$config = config
      if (conns) rt.$conns = conns
      if (logger) rt.$logger = logger
      if (schemas) rt.$schemas = schemas

      // bind arguments in query
      rt.$args = ctx.query

      // bind rest method
      rt.$rest = aq.rest

      // bind a method for get data adapter by object name
      if (conns) {
        rt.$getDbAdapter = (name) => conns.getAdapter(name)
      }

      return rt
    }

    return function *() {
      const ctx = this
      const req = ctx.request

      // set some variants only used in betch$
      const logger = ctx ? ctx.logger : null
      const data = req.body ? req.body : null

      try {
        // get connections
        const conns = ctx.conns ? ctx.conns : null

        // open all connection that defined in configs
        yield conns.openAll()

        try {
          // declare context, it is context for betch nor used for koa
          const ctx$ = parseContext(ctx)

          // use %2f for / if the script under sub-folder
          const reqScript = ctx.params.script
          const script = getScript(reqScript)

          yield betch$(script, ctx$, data).
            then((rt) => {
              // set result to koa context
              ctx.type = 'json'
              ctx.body = rt

              // record successful message to logger
              if (logger) {
                logger.verbose(`execute script(${reqScript}) ok.`)
              }
            }).
            catch((err) => {
              // record error to logger
              if (logger) {
                logger.error(
                  `execute script(${reqScript}) failed,details:${err.message}.`
                )
              }

              that.throw(ctx, err, 500)
            })
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

        that.throw(ctx, err, err.code)
      }
    }
  }

}

module.exports = restsAdapter
