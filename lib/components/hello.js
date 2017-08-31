const Component = require('./super')

// define constants
const BODY = 'Hello World!'

/* sample middle ware for express, koa and koa2 */
class HelloComponent extends Component {

  middleware (ctx) {
    // get current context, it is ctx for koa and koa2
    // in express it includes request and response form (req, res) => {}
    // also context includes some customize methods
    // it must return a promise
    ctx.respond({ body: BODY, type: 'text' })
  }

}

module.exports = HelloComponent
