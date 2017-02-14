const core = require('nblue-core')
const SuperRouter = require('./router-super.js')

const aq = core.aq
const betch$ = core.betch$

const APP_NAME = 'router_script'

const InvaildScriptError = new Error(`can't find script name in request.`)

class ScriptRouter extends SuperRouter
{

  krun () {
    // assign this to that
    const that = this

    // get instance of router config
    const routerConfig = this.RouterConfig

    return function *() {
      // get instance of current context
      const ctx = this

      // get request from context
      const req = ctx.request

      // create instance of context for betch
      const ctx$ = that.createBetchContext({ query: ctx.query })

      // get message data from request
      const body = req.body ? req.body : null

      // generate runable script file name
      const scriptFile = (ctx.params || {}).script

      // declare runtime error
      let runtimeError = null

      yield aq.then(scriptFile).
        then(() => that.getScript(routerConfig, scriptFile)).
        then((script) => betch$(script, ctx$, body)).
        then((data) => that.convertResult(data)).
        then((data) => that.outputToResponse(data, { ctx })).
        catch((err) => {
          // generate new instance of runtime error
          runtimeError = that.createRuntimeError(scriptFile, err)

          // output error to response
          that.outputToResponse(runtimeError, { ctx })
        }).
        finally(() => that.logResult(scriptFile, runtimeError))
    }
  }

  getScript (config, file) {
    // check for arguments
    if (!file) throw InvaildScriptError

    // get base folder for script file
    const base = config.has('base') ? config.get('base') : process.cwd()

    // return full path of script
    const scriptFile = `${base}/${file}.js`

    return aq.
      statFile(scriptFile).
      then(() => scriptFile).
      catch(() => Promise.reject(
        new Error(`can't find script file by name:${scriptFile}`)
      ))
  }

  createBetchContext (options) {
    // assign options to opts
    const opts = options || {}

    // set some variants only used in betch$
    const dataApp = this.getAppByName('data')

    // create new object of context
    const ctx = {}

    // bind data application to context
    ctx.$dataApp = dataApp

    // bind execute function to context
    ctx.$execute = dataApp.execute.bind(dataApp)

    // bind schemas to context
    ctx.$schemas = dataApp.Schemas

    // bind instance of config to context
    ctx.$config = this.WebConfig

    // bind instance of logger to context
    ctx.$logger = this.Logger

    // bind aq rest method to context
    ctx.$rest = aq.rest

    // bind get method to context
    ctx.$get = (url, headers) => aq.rest(url, 'GET', headers)

    // bind options variant to context
    Object.
      keys(opts).
      forEach((key) => {
        ctx[`$${key}`] = opts[key]
      })

    return ctx
  }

  convertResult (data) {
    return typeof data === 'string' ? JSON.parse(data) : data
  }

  createRuntimeError (script, err) {
    // create new instance of runtime error
    const err2 = new Error()

    // set message for runtime error
    err2.message =
      `apply betch script(${script}) failed, details:${err.message}`

    // return new error
    return err2
  }

  logResult (script, err) {
    const logger = this.Logger

    if (logger) {
      if (err) {
        logger.error(err.message, APP_NAME)
      } else {
        logger.verbose(`apply betch script(${script}) ok.`, APP_NAME)
      }
    }
  }

}

module.exports = ScriptRouter
