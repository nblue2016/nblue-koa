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
                          catch((err) => that.throw(ctx, err, 500))

      if (!body) return null

      req.body = body

      return yield next
    }
  }

  throw (ctx, err, number) {
    if (!err) return

    // set context status
    if (number) ctx.status = number
    if (ctx.status === 200 || !ctx.status) ctx.status = 500

    const rt = { error: {} }

    rt.status = ctx.status
    if (err.code) rt.error.code = err.code
    if (err.number) rt.error.number = err.number
    if (err.message) rt.error.message = err.message

    ctx.type = 'json'
    ctx.body = rt
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
