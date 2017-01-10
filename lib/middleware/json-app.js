const cobody = require('co-body')

class JsonApp {

  koa (options) {
    const that = this
    const opts = options || { strict: true }

    return function *(next) {
      const ctx = this
      const req = ctx.request

      if (ctx.method.toUpperCase() === 'GET') {
        return yield next
      }

      if (!req.length) return yield next

      const body = yield cobody.
                          json(ctx, opts).
                          catch((err) => that.throw(ctx, err, {}))

      if (!body) return null

      req.body = body

      return yield next
    }
  }

  throw (ctx, err, options) {
    const that = this
    const opts = options || {}

    if (!err) return

    // set context status
    ctx.status = opts.number ? opts.number : 500

    const rt = { error: {} }

    rt.status = ctx.status

    if (err.code) rt.error.code = err.code
    if (err.number) rt.error.number = err.number
    if (err.message) rt.error.message = err.message

    ctx.type = opts.type || 'json'

    that.setHeaders(ctx, opts.settings || {})
    that.setBody(ctx, rt)
  }

  setHeaders (ctx, settings) {
    const headers = settings.headers || {}

      // append defintion headers
    if (headers) {
      Object.
          keys(headers).
          forEach((key) => {
            ctx.set(key, headers[key])
          })
    }

    // set allow origin header by request
    const origin = ctx.request.headers.origin || 'origin'
    const keyOfAllowOrigin = 'Access-Control-Allow-Origin'

    if (headers[keyOfAllowOrigin] && origin !== '*') {
      let matched = false

      if (Array.isArray(settings.origins) &&
            settings.origins.includes(origin)) {
        matched = true
      } else if (settings.origins === origin) {
        matched = true
      }

      if (matched) ctx.set(keyOfAllowOrigin, origin)
    }
  }

  setBody (ctx, body) {
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

  koaError () {
    const that = this

    return function *(next) {
      const ctx = this

      if (ctx.error) {
        that.throw(ctx, ctx.error, ctx.status)

        return
      }

      yield next
    }
  }

}

module.exports = JsonApp
