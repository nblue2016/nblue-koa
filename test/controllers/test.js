const Controller = require('../../lib/').Controller

class TestRouter extends Controller {

  ls (ctx) {
    ctx.respond({ body: {
      method: 'ls',
      args: [1, 2, 3]
    } })
  }

  hello () {
    return null
  }

  test (ctx) {
    ctx.respond({ body: { name: 'method1' } })
  }

}

module.exports = TestRouter
