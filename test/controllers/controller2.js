const Controller = require('../../lib/').Controller

class Controller2 extends Controller {

  emethod1 () {
    return (req, res) => {
      res.type('json')
      res.send({
        a: 'm1',
        b: 1,
        c: 2
      })
    }
  }

  emethod2 (req, res) {
    res.type('json')
    res.send({
      a: 'm2',
      b: 2,
      c: 2
    })
  }

  method1 () {
    return function *() {
      const ctx = this

      ctx.body = {
        a: 'm1',
        b: 1,
        c: 2
      }
      ctx.type = 'json'

      return yield Promise.resolve()
    }
  }

  method2 () {
    return function *() {
      const ctx = this

      ctx.body = {
        a: 'm2',
        b: 2,
        c: 2
      }
      ctx.type = 'json'

      return yield Promise.resolve()
    }
  }

  k2method1 () {
    return function (ctx) {
      ctx.body = {
        a: 'm1',
        b: 1,
        c: 2
      }
      ctx.type = 'json'
    }
  }

  k2method2 () {
    return function (ctx) {
      ctx.body = {
        a: 'm2',
        b: 2,
        c: 2
      }
      ctx.type = 'json'
    }
  }

}

module.exports = Controller2
