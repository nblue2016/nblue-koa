// define constants
const BODY = 'Hello World!'

class HelloComponent {

  koa () {
    return function *(next) {
      const ctx = this

      ctx.body = BODY

      yield next
    }
  }

  koa2 () {
    return function (ctx, next) {
      ctx.body = BODY

      next()
    }
  }

  express () {
    return (req, res, next) => {
      res.end(BODY)

      next()
    }
  }

}

module.exports = HelloComponent
