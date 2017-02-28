// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')
const Errors = require('./errors')

const aq = core.aq
const betch$ = core.betch$

class ScriptContorler extends Contorler {

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
    // assign this to that
    const that = this

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
    ctx.$logger = this.getLogger()

    // assign system variants in header to betch context
    if (opts.headers) {
      Object.
        keys(opts.headers).
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
      that.getUrl(url),
      method,
      that.getHeaders(headers, opts),
      body
    )

    // bind get method to context
    ctx.$get = (url, headers) => aq.rest(
      that.getUrl(url),
      'GET',
      that.getHeaders(headers, opts)
    )

    // bind get method to context
    ctx.$post = (url, headers, body) => aq.rest(
      that.getUrl(url),
      'POST',
      that.getHeaders(headers, opts),
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
