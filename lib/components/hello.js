// delcare base class for Component
const Component = require('./super')

// define constants
const BODY = 'Hello World!'

/* sample middle ware for express, koa and koa2 */
class HelloComponent extends Component {

  // the function will implement a middleware for all server type
  middleware (ctx) {
    // get current context, it is same as ctx argument in koa and koa2
    // but in express it includes request and response form (req, res) => {}
    // also context includes some customize methods

    // call respond method to output values in context
    ctx.respond({ body: BODY, type: 'text' })
  }

}

module.exports = HelloComponent
