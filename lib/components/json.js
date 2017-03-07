// use libraries
const cobody = require('co-body')
const core = require('nblue-core')
const Component = require('./super')

const co = core.co

// define constrants
const SETTINGS_KEY_OF_RESPONSE = 'response'
const SETTINGS_KEY_OF_RESPONSE_HEADERS = 'headers'
const SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN = 'Access-Control-Allow-Origin'

class JsonComponent extends Component {

  // a koa middleware to parse JSON in request body
  koa (options) {
    // const that = this
    const opts = options || { strict: true }

    // get instance of response function
    const respond = this.krespond.bind(this)

    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of request
      const req = ctx.request

      // ignore parse when the method of request is 'GET'
      // or body of request is empty
      if (req.method.toUpperCase() === 'GET' ||
          !req.length ||
          req.length === 0) {
        return yield next
      }

      try {
        // parse JSON body to object
        const data = yield cobody.json(ctx, opts)

        // bind parsed data to request
        req.body = data

        // go to next middleware
        return yield next
      } catch (err) {
        return respond({
          ctx,
          error: err
        })
      }
    }
  }

  // a koa middleware to parse JSON in request body
  koa2 (options) {
    // const that = this
    const opts = options || { strict: true }

    // get instance of response function
    const respond = this.krespond.bind(this)

    return function (ctx, next) {
      // get instance of request
      const req = ctx.request

      // ignore parse when the method of request is 'GET'
      // or body of request is empty
      if (req.method.toUpperCase() === 'GET' ||
          !req.length ||
          req.length === 0) {
        return next()
      }

      return cobody.json(ctx, opts).
        then((data) => {
          req.body = data
        }).
        then(() => next()).
        catch((err) => respond({
          ctx,
          error: err
        }))
    }
  }

  // an express middleware to parse JSON in request body
  express (options) {
    // const that = this
    const opts = options || { strict: true }

    // get instance of response function
    const respond = this.krespond.bind(this)

    return function (req, res, next) {
      // ignore parse when the method of request is 'GET'
      // or body of request is empty
      if (req.method.toUpperCase() === 'GET' ||
          !req.length ||
          req.length === 0) {
        return next()
      }

      try {
        return co(function *() {
          // parse JSON body to object
          const data = yield cobody.json(req, opts)

          // bind parsed data to request
          req.body = data

          // go to next middleware
          return next()
        })
      } catch (err) {
        return respond({
          req,
          res,
          error: err
        })
      }
    }
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

    // set response status
    if (err) {
      ctx.status = err.status ? err.status : opts.status || 500
    } else {
      ctx.status = opts.status || 200
    }

    // set message to empty if body is empty
    if (!body || body === '') {
      // set empty body to response
      ctx.message = ''
      ctx.body = ''

      ctx.status = 204
      ctx.set('content-length', 0)
    } else {
      // set response body
      ctx.body = this.getStringBody(body)
    }

    // set response content type
    ctx.type = opts.type || 'json'

    // append response headers
    for (const [key, val] of headers) {
      ctx.set(key, val)
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

    // set response status
    if (err) {
      res.status(err.status ? err.status : opts.status || 500)
    } else {
      res.status(opts.status || 200)
    }

    // set message to empty if body is empty
    if (!body || body === '') {
      // set empty body to response
      // res.message = ''
      res.status(204)
      res.set('content-length', 0)
      res.send('')
    } else {
      // set response content type
      res.type(opts.type || 'json')

      // append response headers
      for (const [key, val] of headers) {
        res.set(key, val)
      }

      // set response body
      res.send(this.getStringBody(body))
    }

    res.end()

    // return promise
    return Promise.resolve()
  }

  getErrorBody (err, options) {
    const opts = options || {}

    const rt = {
      error: {},
      status: opts.status
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
