// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')
const Errors = require('./errors')

const aq = core.aq
const betch$ = core.betch$
const co = core.co

class ScriptContorler extends Contorler {

  /* erun () {
    // define function for run script
    const runFunc = this.runScript.bind(this)

    return (req, res, next) => {
      // declare options for running
      const opts = { req, res }

      // get params body from rqeuest
      if (req.body) opts.body = req.body

      // get script name from request
      opts.script = (req.params || {}).script

      // generate response options
      opts.resOpts = { req, res }

      // execute script with options
      runFunc(opts).
        catch((err) => next(err))
    }
  }

  krun () {
    // define function for run script
    const runFunc = this.runScript.bind(this)

    return function *() {
      const ctx = this

      // get request from context
      const req = ctx.request

      // declare options for running
      const opts = { ctx, req }

      // get params body from rqeuest
      if (req.body) opts.body = req.body

      // get script name from request
      opts.script = (ctx.params || {}).script

      // generate response options
      opts.resOpts = { ctx }

      // execute script with options
      return yield runFunc(opts)
    }
  }

  k2run () {
    // define function for run script
    const runFunc = this.runScript.bind(this)

    return function (ctx) {
      // get request from context
      const req = ctx.request

      // declare options for running
      const opts = { ctx, req }

      // get params body from rqeuest
      if (req.body) opts.body = req.body

      // get script name from request
      opts.script = (ctx.params || {}).script

      // generate response options
      opts.resOpts = { ctx }

      return runFunc(opts)
    }
  }
*/

  run (ctx, options) {
    // get request from context
    const req = ctx.request

    const defaultOpts = {
      ctx,
      req,
      query: req.query
    }

    // assign options to opts
    const opts = options || {}

    Object.assign(opts, defaultOpts)

    // generate post body from context or request
    const body = ctx.body || (req.body || null)

    // generate script file from context or request
    const scriptFile = (ctx.params || (req.params || {})).script

    // declare result and result error
    const gen = function *() {
      try {
        // get instance of router config
        const controllerConfig = this.ControllerConfig

        // create instance of context for betch
        const ctx$ = this.createBetchContext(opts)

        // get instance of script by file name
        const script = yield this.getScript(controllerConfig, scriptFile)

        // get result from executing betch script
        const rt = yield betch$(script, ctx$, body || null)

        // convert to result
        const target = yield this.convertResult(rt)

        ctx.respond(target)

        // send result to response
        // this.sendToResponse(target, resOpts)

        // append error to logger
        this.logResult(null, scriptFile)
      } catch (err) {
        // create result error base on catched error
        const newError = this.createRuntimeError(scriptFile, err)

        // output error to response
        // this.sendToResponse(newError, resOpts)
        ctx.respond(newError)

        // append error to logger
        this.logResult(newError, scriptFile)
      }
    }

    return co(gen.bind(this))
  }

  getScript (config, file) {
    // check for arguments
    if (!file) throw Errors.InvaildScriptError

    // get base folder for script file
    const base = config.has('base') ? config.get('base') : process.cwd()

    // return full path of script
    const scriptFile = `${base}/${file}.js`

    return co(function *() {
      try {
        // check file exists or not with full path
        yield aq.statFile(scriptFile)

        // return
        return scriptFile
      } catch (err) {
        // throw new error
        throw new Error(`can't find script file by name:${scriptFile}`)
      }
    })
  }

  getHeaders (headers, options) {
    const obj = headers || {}
    const opts = options || {}

    if (opts.headers) {
      Object.
        keys(opts.headers).
        forEach((key) => {
          if (!obj[key]) obj[key] = opts.headers[key]
        })
    }

    return obj
  }

  getUrl (url) {
    if (url.indexOf('//') < 0) {
      // get instance of nblue application
      const nblue = this.NBlue

      // get url of server with port
      const serverUrl = nblue.getServerUrl()

      // join server url and request url
      return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    // return request url directly
    return url
  }

  createBetchContext (options) {
    // assign options to opts
    const opts = options || {}

    // get request from opts
    const req = opts.req || null

    // get headers from options or request
    const reqHeaders = opts.headers
      ? opts.headers
      : req.headers || {}

      // get headers from options or request
    const reqQuery = opts.query
        ? opts.query
        : req.query || null

    // set some variants only used in betch$
    const dc = this.getComponentByName('data')

    // define function to get url and headers for curl
    const getUrlFunc = this.getUrl.bind(this)
    const getHeadersFunc = this.getHeaders.bind(this)

    // create new object of context
    const ctx = {}

    // set request variants to context
    if (reqHeaders) {
      ctx.headers = reqHeaders
      if (!opts.headers) opts.headers = reqHeaders
    }
    if (reqQuery) {
      ctx.query = reqQuery
      if (!opts.query) opts.query = reqQuery
    }

    // bind data application to context
    ctx.$dc = dc

    // bind arguments to context
    ctx.$args = opts.query

    // bind execute function to context
    ctx.$execute = ctx.$exec = dc.execute.bind(dc)

    // bind pexecute function to context
    ctx.$pexecute = ctx.$pexec = dc.pexecute.bind(dc)

    // bind schemas to context
    ctx.$schemas = dc.Schemas

    // bind instance of config to context
    ctx.$config = this.NConfig

    // bind instance of logger to context
    ctx.$logger = this.getLogger()

    // assign system variants in header to betch context
    if (reqHeaders) {
      Object.
        keys(reqHeaders).
        filter((key) => key.startsWith('$')).
        map((key) => {
          switch (key) {
          case '$full':
          case '$fullreturn':
            return '$fullReturn'
          case '$throw':
          case '$throwerror':
            return '$throwError'
          case '$ignoreerror':
            return '$ignoreError'
          default:
            return key
          }
        }).
        filter((key) => key).
        forEach((key) => {
          ctx[key] = true
        })
    }

    // bind aq rest method to context
    ctx.$rest = (url, method, headers, body) => aq.rest(
      getUrlFunc(url),
      method,
      getHeadersFunc(headers, opts),
      body
    )

    // bind get method to context
    ctx.$get = (url, headers) => aq.rest(
      getUrlFunc(url),
      'GET',
      getHeadersFunc(headers, opts)
    )

    // bind get method to context
    ctx.$post = (url, headers, body) => aq.rest(
      getUrlFunc(url),
      'POST',
      getHeadersFunc(headers, opts),
      body
    )

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

  logResult (err, script) {
    const logger = this.getLogger()

    if (!logger) return

    if (err) {
      logger.error(`apply betch script => ${script} failed.`, err)
    } else {
      logger.verbose(`apply betch script => ${script} ok.`)
    }
  }

}

module.exports = ScriptContorler
