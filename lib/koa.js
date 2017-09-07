// use libraries
const Constants = require('./constants')
const Application = require('./application')

class KoaApplication extends Application {

  get ServerType () {
    return Constants.ServerOfKoa
  }

  getPackages () {
    return ['koa@1', 'koa-static@2.1', 'koa-router@5']
  }

  createInstance () {
    // declare koa
    const KOA = require('koa')

    // return new instance
    return new KOA()
  }

  createServer (app) {
    // return new instance of server
    return super.createServer(app.callback())
  }

  use () {
    // get instance of koa application
    const app = this.Application

    // define function to emit event
    const emitFunc = this.emit.bind(this)

    // create middleware to process session event
    app.use(function *(next) {
      // get instance of context
      const ctx = this

      // emit event for session start
      emitFunc(Constants.EventOfSessionStart, ctx)

      // call next
      yield next

      // emit event for session end
      emitFunc(Constants.EventOfSessionEnd, ctx)
    })

    return super.use()
  }

}

module.exports = KoaApplication
