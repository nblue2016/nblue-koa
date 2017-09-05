const Controller = require('../../lib/').Controller

const Body1 = {
  a: 'm1',
  b: 1,
  c: 2
}

const Body2 = {
  a: 'm2',
  b: 2,
  c: 2
}

class Controller2 extends Controller {

  emethod1 () {
    return (req, res) => {
      res.type('json')
      res.send(Body1)
    }
  }

  emethod2 () {
    return (req, res) => {
      res.type('json')
      res.send(Body2)
    }
  }

  method1 (ctx) {
    ctx.respond({
      body: Body1,
      type: 'json'
    })
  }

  method2 (ctx) {
    ctx.respond({
      body: Body2,
      type: 'json'

    })
  }

}

module.exports = Controller2
