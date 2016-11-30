class HelloApp {

  koa () {
    return function *(next) {
      const ctx = this

      ctx.body = 'Hello World!'

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
