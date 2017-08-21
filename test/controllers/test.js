const Controller = require('../../lib/').Controller

class TestRouter extends Controller {

  ls () {
    return this.generateResponse({
      method: 'ls',
      args: [1, 2, 3]
    })
  }

  // methods for koa
  ktest () {
    return function *() {
      const ctx = this

      ctx.body = { name: 'method1' }

      yield Promise.resolve()
    }
  }

  k2test (ctx) {
    ctx.type = 'json'
    ctx.body = { name: 'method1' }
  }

  etest (req, res) {
    res.status(200).json({ name: 'method1' })
  }

}

module.exports = TestRouter
