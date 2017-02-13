const cobody = require('co-body')
const SuperApp = require('./app-super')

const SETTINGS_KEY_OF_RESPONSE = 'response'
const SETTINGS_KEY_OF_RESPONSE_HEADERS = 'headers'
const SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN = 'Access-Control-Allow-Origin'

class JsonApp extends SuperApp {

  // a middleware to parse JSON in request body
  koa (options) {
    const that = this
    const opts = options || { strict: true }

    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of request
      const req = ctx.request

      // ignore parse when the method of request is 'GET'
      // or body of request is empty
      if (ctx.method.toUpperCase() === 'GET' ||
          !req.length ||
          req.length === 0) {
        return yield next
      }

      // parse JSON body to object
      const rt = yield cobody.
        json(ctx, opts).
        then((data) => {
          // set body to request
          req.body = data

          // parse ok
          return true
        }).
        catch((err) => {
          that.responseKoa(ctx, { error: err })

          // parse failed
          return false
        })

      return rt === true ? yield next : null
    }
  }

  responseKoa (ctx, options) {
    // assign options to opts
    const opts = options || {}

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
    const body = err ? this.getErrorBody(err, opts) : opts.body || ''

    // set response status
    if (err) {
      ctx.status = err.status ? err.status : opts.status || 500
    } else {
      ctx.status = opts.status || 200
    }

    // set response content type
    ctx.type = opts.type || 'json'

    for (const [key, val] of headers) {
      ctx.set(key, val)
    }

    // set response body
    ctx.body = this.getStringBody(body)

    return Promise.resolve(0)
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

module.exports = JsonApp
