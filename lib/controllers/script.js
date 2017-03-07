// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')
const Errors = require('./errors')

const aq = core.aq
const betch$ = core.betch$
const co = core.co

class ScriptContorler extends Contorler {

  erun () {
    // define function to create context for apply betch
    const createContextFunc = this.createBetchContext.bind(this)

    // get instance of router config
    const controllerConfig = this.ControllerConfig

    // define function to get script
    const getScriptFunc = this.getScript.bind(this)

    // define function to convert result
    const convertFunc = this.convertResult.bind(this)

    // define function t respond result
    const respond = this.outputToResponse.bind(this)

    // define function to create runtime error
    const createErrorFunc = this.createRuntimeError.bind(this)

    // define function to log result
    const logFunc = this.logResult.bind(this)

    return (req, res) => {
      // create instance of context for betch
      const ctx$ = createContextFunc({ req })

      // get message data from request
      const body = req.body ? req.body : null

      // generate runable script file name
      const scriptFile = (req.params || {}).script

      // create options for response
      const responseOpts = {}

      responseOpts.req = req
      responseOpts.res = res

      return co(function *() {
        try {
          // get instance of script by file name
          const script = yield getScriptFunc(controllerConfig, scriptFile)

          // get result from executing betch script
          let rt = yield betch$(script, ctx$, body)

          // convert to result
          rt = yield convertFunc(rt)

          // output result to response
          respond(rt, responseOpts)

          // append result to logger
          return logFunc(null, scriptFile)
        } catch (err) {
          // create
          const newError = createErrorFunc(scriptFile, err)

          // output error to response
          respond(newError, responseOpts)

          // append error to logger
          return logFunc(newError, scriptFile)
        }
      })
    }
  }

  krun () {
    // assign this to that
    const that = this

    // get instance of router config
    const controllerConfig = this.ControllerConfig

    return function *() {
      // get instance of current context
      const ctx = this

      // get request from context
      const req = ctx.request

      // create instance of context for betch
      const ctx$ = that.
        createBetchContext({
          query: ctx.query,
          headers: req.headers
        })

      // get message data from request
      const body = req.body ? req.body : null

      // generate runable script file name
      const scriptFile = (ctx.params || {}).script

      // declare runtime error
      let runtimeError = null

      yield aq.then(scriptFile).
        then(() => that.getScript(controllerConfig, scriptFile)).
        then((script) => betch$(script, ctx$, body)).
        then((data) => that.convertResult(data)).
        then((data) => that.outputToResponse(data, { ctx })).
        catch((err) => {
          // generate new instance of runtime error
          runtimeError = that.createRuntimeError(scriptFile, err)

          // output error to response
          that.outputToResponse(runtimeError, { ctx })
        }).
        finally(() => that.logResult(runtimeError, scriptFile))
    }
  }

  getScript (config, file) {
    // check for arguments
    if (!file) throw Errors.InvaildScriptError

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
      const napp = this.NApp

      // get url of server with port
      const serverUrl = napp.getServerUrl()

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
      : req.headers || null

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

    // bind execute function to context
    ctx.$execute = ctx.$exec = dc.execute.bind(dc)

    // bind pexecute function to context
    ctx.$pexecute = ctx.$pexec = dc.pexecute.bind(dc)

    // bind schemas to context
    ctx.$schemas = dc.Schemas

    // bind instance of config to context
    ctx.$config = this.WebConfig

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
