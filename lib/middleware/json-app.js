const cobody = require('co-body')

class JsonApp {

  // a middleware to parse JSON in request body
  koa (options) {
    const that = this
    const opts = options || { strict: true }

    return function *(next) {
      const ctx = this
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

    that.setHeaders(ctx, opts.settings || (ctx.settings || {}))
    that.setBody(ctx, rt, opts)
  }

  // set response headers
  setHeaders (ctx, settings) {
    // get settings for response
    const keyOfResponse = 'json-response'
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
      break
    }
  }

  /* koaError () {
    const that = this

    return function *(next) {
      const ctx = this

      if (ctx.error) {
        that.setError(
          ctx, ctx.error, { status: ctx.status }
        )

        return
      }

      yield next
    }
  } */

}

module.exports = JsonApp
