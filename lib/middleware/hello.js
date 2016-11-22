
class Hello {

  koa () {
    return function *(next) {
      const ctx = this

      ctx.body = 'Hello World!'

      yield next
    }
  }

}

module.exports = Hello
