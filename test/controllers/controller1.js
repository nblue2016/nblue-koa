const Controller = require('../../lib/').Controller

class Controller1 extends Controller {

  method1 (ctx) {
    return this.respond(ctx, {
      body: {
        a: 'm1',
        b: 2,
        c: 1
      }
    })
  }

  method2 (ctx) {
    return this.respond(ctx, {
      body: {
        a: 'm1',
        b: 2,
        c: 1
      }
    })
  }

}

module.exports = Controller1
