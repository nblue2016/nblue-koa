const Controller = require('../../lib/').Controller

class TestRouter extends Controller {

  ls () {
    return this.generateResponse({
      method: 'ls',
      args: [1, 2, 3]
    })
  }

  method1 () {
    return function *() {
      const ctx = this

      ctx.body = { name: 'method1' }

      yield Promise.resolve()
    }
  }

  method2 () {
    return function () {
      const ctx = this

      ctx.body = { name: 'method2' }
    }
  }

}

module.exports = TestRouter
