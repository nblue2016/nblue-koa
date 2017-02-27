const cobody = require('co-body')

class FormComponent {

  koa (options) {
    const opts = options || { strict: true }

    return function *(next) {
      const ctx = this
      const req = ctx.request

      if (ctx.method.toUpperCase() === 'GET') {
        return yield next
      }

      if (!req.length) return yield next

      const body = yield cobody.
                          form(ctx, opts).
                          catch(() => null)

      if (!body) return null

      req.body = body

      return yield next
    }
  }

}

module.exports = FormComponent
