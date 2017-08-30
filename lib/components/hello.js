const Component = require('./super')

// define constants
const BODY = 'Hello World!'

/* sample middle ware for express, koa and koa2 */
class HelloComponent extends Component {

  /* koa () {
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
  } */

  middleware (ctx) {
    // get current context, it is ctx for koa and koa2
    // in express it includes request and response form (req, res) => {}
    // also context includes some customize methods
    // it must return a promise
    ctx.respond({ body: BODY, type: 'text' })
  }

}

module.exports = HelloComponent
