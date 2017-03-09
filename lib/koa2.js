// use libraries
const Constants = require('./constants')
const Application = require('./koa')

class Koa2Application extends Application {

  get ServerType () {
    return Constants.ServerOfKoa2
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
        then(() => emitFunc(Constants.EventOfSessionEnd, ctx))
    })

    return super.use()
  }

}

module.exports = Koa2Application
