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

  emethod2 () {
    return (req, res) => {
      res.type('json')
      res.send({
        a: 'm2',
        b: 2,
        c: 2
      })
    }
  }

  method1 (ctx) {
    ctx.respond(ctx, {
      body: {
        a: 'm1',
        b: 1,
        c: 2
      },
      type: 'json'
    })
  }

  method2 (ctx) {
    ctx.respond(ctx, {
      body: {
        a: 'm2',
        b: 2,
        c: 2
      },
      type: 'json'

    })
  }

}

module.exports = Controller2
