const cobody = require('co-body')

class jsonMW {

  koa (options) {
    const opts = options || { strict: true }

    return function *(next) {
      const ctx = this
      const req = ctx.request

      switch (ctx.method.toUpperCase()) {
      case 'GET':
        return yield next
      default:
        req.body = yield cobody.json(ctx.req, opts)

        return yield next
      }
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


module.exports = jsonMW
