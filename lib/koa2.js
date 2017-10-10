// use libraries
const Constants = require('./constants')
const Application = require('./application')

class Koa2Application extends Application {

  get ServerType () {
    return Constants.ServerOfKoa2
  }

  getPackages () {
    return ['koa@2', 'koa-static@3', 'koa-router@7']
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
    // get instance of koa2 application
    const app = this.Application

    // define function to emit event
    const emitFunc = this.emit.bind(this)

    // create middleware to process session event
    app.use((ctx, next) => {
      // emit event for session start
      emitFunc(Constants.EventOfSessionStart, ctx)

      // emit event for session end
      return next().
        finally(() => emitFunc(Constants.EventOfSessionEnd, ctx))
    })

    return super.use()
  }

}

module.exports = Koa2Application
