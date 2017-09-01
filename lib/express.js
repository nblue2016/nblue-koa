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

    // try to get instance of cookie middleware
    const cookieParser = this.getCookieParser()

    // use cookie middleware
    if (cookieParser) app.use(cookieParser)

    return super.use()
  }

  getCookieParser () {
    try {
      // get instance of cookie parser
      const cookieParser = require('cookie-parser')

      // get instance of config
      const config = this.Config

      // try to get cookies setting in config
      if (config.has('cookies')) {
        // convert config section to an object
        const cookieConfig = config.get('cookies').toObject()

        // check secret value from config section
        if (cookieConfig.secret) {
          // return parser with settings
          return cookieParser(
            cookieConfig.secret,
            cookieConfig.options || {}
          )
        }
      }

      // return original parser
      return cookieParser()
    } catch (err) {
      return null
    }
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

    // get instance of application
    const app = this.Application

    // add the latest middleware to catch unknown error
    app.use((err, req, res, next) => {
      if (err) {
        // append error to logger
        if (logger) logger.error(err.message, err)

        // respond error to client
        res.status(500).send('unknown error')
      }

      // invoke next middlewares
      return next()
    })

    // call super method to start web server
    super.listen()
  }

}

module.exports = ExpressApplication
