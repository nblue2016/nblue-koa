// use libraries
const cobody = require('co-body')
const core = require('nblue-core')
const Component = require('./super')

const co = core.co

// define constants
const SETTINGS_KEY_OF_RESPONSE = 'response'
const SETTINGS_KEY_OF_RESPONSE_HEADERS = 'headers'
const SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN = 'Access-Control-Allow-Origin'

class JsonComponent extends Component {

  // a koa middleware to parse JSON in request body
  koa (options) {
    // get instance of response function
    const respond = this.krespond.bind(this)

    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function *(next) {
      // get instance of context
      const ctx = this

      // get request from context
      const req = ctx.request

      try {
        // parse JSON body
        yield parseFunc(req, options)

        // invoke next middlewares
        yield next
      } catch (err) {
        respond({ ctx, error: err })
      }
    }
  }

  // a koa2 middleware to parse JSON in request body
  koa2 (options) {
    // get instance of response function
    const respond = this.krespond.bind(this)

    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function (ctx, next) {
      // get request from context
      const req = ctx.request

      // parse JSON body
      return parseFunc(req, options).
        then(() => next()).
        catch((err) => respond({ ctx, error: err }))
    }
  }

  // an express middleware to parse JSON in request body
  express (options) {
    // get instance of respond function
    const respond = this.erespond.bind(this)

    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function (req, res, next) {
      return parseFunc(req, options).
        then(() => next()).
        catch((err) => respond({ req, res, error: err }))
    }
  }

  getOptions (options) {
    return options || { strict: true }
  }

  parseBody (req, options) {
    // assign options to opts
    const opts = this.getOptions(options)

    // co a generator function to return a Promise
    return co(function *() {
      // ignore parse when the method of request is 'GET' or 'OPTIONS'
      if (req.method.toUpperCase() === 'GET' ||
        req.method.toUpperCase() === 'OPTIONS') return

      // get length of request body
      const length = req.headers['content-length']

      // exit if can't find length in headers or length is zero
      if (!length || length && length === 0) return

      // use co-body to parse json
      const data = yield cobody.json(req, opts)

      // set json data to request body
      if (data) req.body = data
    })
  }

  krespond (options) {
    // assign options to opts
    const opts = options || {}

    // get context from options
    const ctx = opts.ctx

    // check context in options
    if (!ctx) throw new ReferenceError('ctx')

    // get settings form options
    const settings = opts.settings
      ? opts.settings
      : this.WebSettings || new Map()

    // get map of response headers
    const headers = this.getHeaders(
      settings, {
        origin: ctx.request.headers.origin
      }
    )

    // get error from options
    const err = opts.error || null

    // get object of resposne body
    const body = err ? this.getErrorBody(err, opts) : opts.body

    let status = null

    // set response status
    if (err) {
      status = (err.status ? err.status : opts.status) || 500
    } else {
      status = opts.status || 200
    }

    // set message to empty if body is empty
    if (!body || body === '') {
      ctx.set('content-length', 0)
      ctx.status = status || 204

      // set empty body to response
      ctx.message = ''
      ctx.body = ''
    } else {
      // append response headers
      for (const [key, val] of headers) {
        ctx.set(key, val)
      }

      // set status for response
      ctx.status = status

      // set response content type
      ctx.type = opts.type || 'json'

      // set response body
      ctx.body = this.getStringBody(body)
    }

    // return promise
    return Promise.resolve()
  }

  erespond (options) {
    // assign options to opts
    const opts = options || {}

    // get request and response from options
    const req = opts.req
    const res = opts.res

    // check context in options
    if (!req) throw new ReferenceError('req')
    if (!res) throw new ReferenceError('res')

    // get settings form options
    const settings = opts.settings
      ? opts.settings
      : this.WebSettings || new Map()

    // get map of response headers
    const headers = this.getHeaders(
      settings, {
        origin: req.headers.origin
      }
    )

    // get error from options
    const err = opts.error || null

    // get object of resposne body
    const body = err ? this.getErrorBody(err, opts) : opts.body

    let statusCode = 200

    // set message to empty if body is empty
    if (!body || body === '') {
      // set empty body to response
      // res.message = ''
      res.set('content-length', 0)
      statusCode = 204
    } else {
      // append response headers
      for (const [key, val] of headers) {
        res.set(key, val)
      }

      // set response content type
      res.type(opts.type || 'json')

      // set response status
      if (err) {
        statusCode = err.status ? err.status : opts.status || 500
      } else {
        statusCode = opts.status || 200
      }
    }

    res.status(statusCode).json(body)
  }

  getErrorBody (err, options) {
    const opts = options || {}

    const rt = {
      error: {},
      status: err.status || opts.status
    }

    // set properties of error node
    if (err.code) rt.error.code = err.code
    if (err.number) rt.error.number = err.number
    if (err.message) rt.error.message = err.message

    return rt
  }

  getStringBody (body) {
    switch (typeof body) {
    case 'string':
      return body
    case 'object':
      return JSON.stringify(body, null, 4)
    default:
      return body.toString()
    }
  }

  getHeaders (settings, options) {
    const headers = new Map()
    const opts = options || {}

    // get settings for response
    const resSettings =
      settings && settings.has(SETTINGS_KEY_OF_RESPONSE)
        ? settings.get(SETTINGS_KEY_OF_RESPONSE).toObject()
        : {}

    // get headers section from settings
    const headersSection = resSettings[SETTINGS_KEY_OF_RESPONSE_HEADERS] || {}

    // append defintion headers
    if (headersSection) {
      Object.
        keys(headersSection).
        forEach((key) => {
          headers.set(key, headersSection[key])
        })
    }

    // set allow origin header by request
    const origin = opts.origin || 'unknown'

    // set value of header for 'Access-Control-Allow-Origin'
    if (headersSection[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] &&
        headersSection[SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN] !== '*') {
      // set origin value to header
      if (Array.isArray(resSettings.origins) &&
          resSettings.origins.includes(origin)) {
        headers.set(SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN, origin)
      } else if (resSettings.origins === origin) {
        headers.set(SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN, origin)
      }
    }

    // return map of headers
    return headers
  }

}

module.exports = JsonComponent
