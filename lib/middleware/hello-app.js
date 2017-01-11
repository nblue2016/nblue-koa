class HelloApp {

  koa () {
    return function *(next) {
      const ctx = this
      const message = 'Hello World!'

      ctx.body = message

      yield next
    }
  }

  koa2 () {
    return function (ctx, next) {
      ctx.body = 'Hello World!'

      next()
    }
  }

}

module.exports = HelloApp
