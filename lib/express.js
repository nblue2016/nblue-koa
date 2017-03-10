// use libraries
const core = require('nblue-core')

const aq = core.aq
const Constants = require('./constants')
const Application = require('./application')

class ExpressApplication extends Application {

  get ServerType () {
    return Constants.ServerOfExpress
  }

  getPackages () {
    return ['express', 'cookie-parser']
  }

  use () {
    // get instance of express application
    const app = this.Application

    // define function to emit event
    const emitFunc = this.emit.bind(this)

    // create middleware to process session event
    app.use((req, res, next) => {
      // emit event for session start
      emitFunc(Constants.EventOfSessionStart, req, res)

      // get function for res.end()
      const endFunc = res.end.bind(res)

      // emit event for session end
      res.end = (chunk, encoding) => {
        aq.then(0).
          then(() => emitFunc(Constants.EventOfSessionEnd, req, res)).
          then(() => endFunc(chunk, encoding))
      }

      next()
    })

    return super.use()
  }

  createInstance () {
    // declare express
    const Express = require('express')

    // return new instance
    return Express()
  }

  listen () {
    // get instance of logger
    const logger = this.getLogger()

    // add middleware to catch unknown error
    this.Application.use((err, req, res, next) => {
      // append error to logger
      if (logger) logger.error(err.message, err)

      // respond error to client
      res.status(500).send('unknown error')

      // invoke next middlewares
      return next()
    })

    // call super method to start web server
    super.listen()
  }

  respond (options) {
    // get instance of application manager
    const comgr = this.ComponentManager

    // assign options to opts
    const opts = options || {}

    // get type of response
    const responseType = 'json'

    // response result by type
    switch (responseType) {
    // case 'xml':
    case 'json':
    default:
      return comgr.
        getComponent('json').
        erespond(opts)
    }
  }

}

module.exports = ExpressApplication
