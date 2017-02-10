const cobody = require('co-body')

const SETTINGS_KEY_OF_RESPONSE = 'response'
const SETTINGS_KEY_OF_RESPONSE_HEADERS = 'headers'
const SETTINGS_KEY_OF_HEADER_ALLOW_ORIGIN = 'Access-Control-Allow-Origin'

class JsonApp {

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
          that.setError(ctx, err, {})

          // parse failed
          return false
        })

      return rt ? yield next : null
    }
  }

  // set response body for error
  setError (ctx, err, options) {
    const that = this
    const opts = options || {}
    const settings = that.WebSettings

    if (!err) return

    // set context status
    if (!opts.status) opts.status = 500

    const rt = {
      error: {},
      status: opts.status
    }

    // set properties of error node
    if (err.code) rt.error.code = err.code
    if (err.number) rt.error.number = err.number
    if (err.message) rt.error.message = err.message

    that.setHeaders(ctx, opts.settings || (settings || new Map()))
    that.setBody(ctx, rt, opts)
  }

  // set response headers
  setHeaders (ctx, settings) {
    // get settings for response
    const keyOfResponse = 'jsonResponse'
    const resSettings =
      settings && settings.has(keyOfResponse)
        ? settings.get(keyOfResponse).toObject()
        : {}

    const headers = resSettings.headers || {}

    // append defintion headers
    if (headers) {
      Object.
        keys(headers).
        forEach((key) => {
          ctx.set(key, headers[key])
        })
    }

    // set allow origin header by request
    const origin = ctx.request.headers.origin || 'unknown'
    const keyOfAllowOrigin = 'Access-Control-Allow-Origin'

    if (headers[keyOfAllowOrigin] &&
        headers[keyOfAllowOrigin] !== '*') {
      if (Array.isArray(resSettings.origins) &&
          resSettings.origins.includes(origin)) {
        ctx.set(keyOfAllowOrigin, origin)
      } else if (resSettings.origins === origin) {
        ctx.set(keyOfAllowOrigin, origin)
      }
    }
  }

  // set response body
  setBody (ctx, body, options) {
    const opts = options || {}

    ctx.status = opts.status || 200
    ctx.type = opts.type || 'json'

    switch (typeof body) {
    case 'string':
      ctx.body = body
      break
    case 'object':
      ctx.body = JSON.stringify(body, null, 4)
      break
    default:
      ctx.body = body.toString()
      break
    }
  }

  responseKoa (ctx, options) {
    // assign options to opts
    const opts = options || {}

    // get settings form options
    const settings = opts.settings || (this.WebSettings || new Map())

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
