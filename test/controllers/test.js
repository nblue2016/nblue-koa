const Controller = require('../../lib/').Controller

class TestRouter extends Controller {

  ls (ctx) {
    this.respond(ctx, { body: {
      method: 'ls',
      args: [1, 2, 3]
    } })
  }

  hello () {
    // return this.generateResponse('O')
    return null
  }

  test (ctx) {
    this.respond(ctx, { body: { name: 'method1' } })
  }

}

module.exports = TestRouter
