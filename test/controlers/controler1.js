const Controler = require('../../lib/router/router-super.js')

class Controler1 extends Controler {

  method1 () {
    return function *() {
      const ctx = this

      ctx.body = {
        a: 'm1',
        b: 2,
        c: 1
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
        c: 1
      }
      ctx.type = 'json'

      return yield Promise.resolve()
    }
  }

}

module.exports = Controler1
