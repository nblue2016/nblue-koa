// const core = require('nblue-core')
const SuperLogger = require('../../lib/components/logger')

const output = (... args) => console.log(...args)

class Logger extends SuperLogger {

  constructor (napp, options) {
    super(napp, options)

    output('create')
  }

  koa () {
    // assign this to that
    const that = this

    // get instance of logger
    const logger = that.Logger

    return function *(next) {
      // get instance of context
      const ctx = this

      // get time for now
      ctx.start = new Date()

      yield next

      const line = that.generateRequestLine(ctx)

      // append info to logger
      if (logger) {
        logger.verbose(line)
      }

      output(line)
    }
  }

  generateHandlers (logger) {
    super.generateHandlers(logger)

    this._handlers.set('err', (err) => {
      logger.error(`error(${err.name}) catched`, err)

      output('error:')
      output(err.message)
    })
  }

}

module.exports = Logger
