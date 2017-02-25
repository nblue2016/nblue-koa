const SuperRouter = require('../../lib/router/router-super.js')

class TestRouter extends SuperRouter {

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

      yield Promise.resolve(0)
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
