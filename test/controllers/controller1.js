const Controller = require('../../lib/').Controller

class Controller1 extends Controller {

  method1 () {
    return this.generateResponse({
      a: 'm1',
      b: 2,
      c: 1
    })
  }

  method2 () {
    return this.generateResponse({
      a: 'm2',
      b: 2,
      c: 1
    })
  }

}

module.exports = Controller1
