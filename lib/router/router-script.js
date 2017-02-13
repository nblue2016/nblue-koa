const core = require('nblue-core')
const SuperRouter = require('./router-super.js')

const aq = core.aq
const betch$ = core.betch$
const StringBuilder = core.StringBuilder

class ScriptRouter extends SuperRouter
{

  krun () {
    const that = this
    const routerConfig = this.RouterConfig
    // const amgr = that.ApplicationManager
    const dataApp = this.getAppByName('data')

    // define a function to get real script file by request
    const getScript = (file) => {
      const base = routerConfig.has('base')
        ? routerConfig.get('base')
        : process.cwd()

      return `${base}/${file}.js`
    }

    const parseBetchContext = function (ctx, conns) {
      // set some variants only used in betch$
      const config = that.WebConfig
      const logger = that.Logger
      const schemas = dataApp.Schemas

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

    const catchError = (ctx, script, err) => {
      const logger = that.Logger
      const sb = new StringBuilder()

      sb.append(`apply ${script} failed, `)
      sb.append(`details: ${err.message}`)

      const message = sb.toString()

      if (logger) logger.error(message, 'rest')

      err.message = message

      that.outputToResponse(
        err, {
          ctx,
          status: 500
        })
    }

    return function *() {
      const ctx = this
      const req = ctx.request
      const params = ctx.params || {}

      // set some variants only used in betch$
      const logger = that.Logger
      const data = req.body ? req.body : null

      try {
        // get connections
        const conns = dataApp.createConnections()

        // open all connection that defined in configs
        yield conns.openAll()

        try {
          // use %2f for / if the script under sub-folder
          if (!params.script) {
            throw new Error(`can't find script name in request.`)
          }

          // declare context, it is context for betch nor used for koa
          const ctx$ = parseBetchContext(ctx, conns)
          const script = getScript(params.script)

          yield betch$(script, ctx$, data).
            then((rt) => {
              // set result to koa context
              ctx.type = 'json'
              ctx.body = typeof rt === 'string' ? JSON.parse(rt) : rt

              // record successful message to logger
              if (logger) {
                logger.verbose(`execute script(${params.script}) ok.`)
              }
            }).
            catch((err) => {
              catchError(ctx, params.script, err)
            })
        } finally {
          yield conns.closeAll()
        }
      } catch (err) {
        catchError(ctx, params.script, err)
      }
    }
  }

}

module.exports = ScriptRouter
