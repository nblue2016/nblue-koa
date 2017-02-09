const core = require('nblue-core')
const SuperApp = require('./app-super')

const Logger = core.Logger
const StringBuilder = core.StringBuilder

const HANDLER_KEY_OF_ERROR = 'error'
const HANDLER_KEY_OF_REJECTION = 'rejection'
const HANDLER_KEY_OF_WARNING = 'warning'

class LoggerApp extends SuperApp {

  constructor (napp) {
    super(napp)

    this._handlers = new Map()
  }

  create (options) {
    const opts = options || {}

    // get instance of nblue application
    const napp = this.NApp

    // get instance of config
    const config = this.WebConfig

    // get config key of logger
    const configKey = opts.configKey || 'logger'

    // get config section for logger
    const loggerSection = config && config.has(configKey)
      ? config.get(configKey)
      : new Map()

    // generate function for outputter
    const outputter = () => {
      if (opts.createOutputter) {
        return opts.createOutputter()
      }

      let logFile = null

      if (opts.file) logFile = opts.file
      else if (loggerSection.has('file')) {
        logFile = loggerSection.get('file')
      }

      if (logFile) {
        const settings =
            config.has('settings') ? config.get('settings') : new Map()
        const base =
            settings.has('base') ? settings.get('base') : process.cwd()

        if (logFile.startsWith('.')) logFile = `${base}/${logFile}`

        return Logger.createFileOutputter(logFile)
      }

      return Logger.createMemoryOutputter()
    }

    // create new instance of logger
    const logger = new Logger(outputter())

    // init properies of logger with options
    if (opts.lineFormat) logger.LineFormat = opts.lineFormat
    if (opts.level) logger.Level = opts.level
    if (opts.levels) {
      for (const [k, v] of opts.levels) {
        logger.setLogLevel(k, v)
      }
    }

    if (opts.getLevelText) logger.getLevelText = opts.getLevelText
    if (opts.getMessageText) logger.getMessageText = opts.getMessageText

    // init properies of logger with config file
    // it will overwrite properies for options
    if (loggerSection.has('level')) logger.Level = loggerSection.get('level')

    if (loggerSection.has('lineFormat')) {
      logger.LineFormat = loggerSection.get('lineFormat')
    }

    // set logger level for objects
    if (loggerSection.has('levels')) {
      for (const [k, v] of loggerSection.get('levels')) {
        logger.setLogLevel(k, v)
      }
    }

    // save instance of logger to nblue application cache
    napp.saveToCache(napp.Keys.Logger, logger)

    // generate handlers for global events
    this.generateHandlers(logger)

    // bind handlers to target event
    this.bindHandlers()

    // return instance of logger
    return logger
  }

  release () {
    this.removeHandlers()
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
      const start = new Date()

      yield next

      // create new instance of string builder
      const sb = new StringBuilder()

      // append request infomation
      sb.append(ctx.url)
      sb.append(' (')
      sb.appendFormat('%s, ', ctx.method)
      sb.appendFormat('%s, ', ctx.status)
      if (ctx.session && ctx.session.id) {
        sb.appendFormat('sid:%s, ', ctx.session.id)
      }
      sb.appendFormat(':%sms', new Date() - start)
      sb.append(')')

      // append info to logger
      if (logger) logger.verbose(sb.toString())
    }
  }

  generateHandlers (logger) {
    const errHandler = (err) => {
      logger.error(
          `error(${err.name}) catched, details: ${err.message}`
        )
    }

    const rejectionHandler = (reason) => {
      logger.error(
          `rejection catched, details: ${reason}`
        )
    }

    const warningHandler = (warning) => {
      logger.warning(
          `warning(${warning.name}) catched, details: ${warning.message}`
        )
    }

    this._handlers.set(HANDLER_KEY_OF_ERROR, errHandler)
    this._handlers.set(HANDLER_KEY_OF_REJECTION, rejectionHandler)
    this._handlers.set(HANDLER_KEY_OF_WARNING, warningHandler)
  }

  bindHandlers () {
    // get defined handlers
    const handlers = this._handlers

    // bind error handlers
    if (handlers.has(HANDLER_KEY_OF_ERROR)) {
      // get instance of application
      const app = this.WebApplication

      if (app) app.on('error', handlers.get(HANDLER_KEY_OF_ERROR))

      process.on('err', handlers.get(HANDLER_KEY_OF_ERROR))
      process.on('uncaughtException', handlers.get(HANDLER_KEY_OF_ERROR))
    }

    // bind rejection handler
    if (handlers.has(HANDLER_KEY_OF_REJECTION)) {
      process.on('unhandledRejection', handlers.get(HANDLER_KEY_OF_REJECTION))
    }

    // bind warning handler
    if (handlers.has(HANDLER_KEY_OF_WARNING)) {
      process.on('warning', handlers.get(HANDLER_KEY_OF_WARNING))
    }
  }

  removeHandlers () {
    // get defined handlers
    const handlers = this._handlers

    // remove warning handler
    if (handlers.has(HANDLER_KEY_OF_WARNING)) {
      process.removeListener('warning', handlers.get(HANDLER_KEY_OF_WARNING))
    }

    // remove rejection handler
    if (handlers.has(HANDLER_KEY_OF_REJECTION)) {
      process.removeListener(
        'unhandledRejection', handlers.get(HANDLER_KEY_OF_REJECTION)
      )
    }

    // remove error handlers
    if (handlers.has(HANDLER_KEY_OF_ERROR)) {
      process.removeListener(
        'uncaughtException', handlers.get(HANDLER_KEY_OF_ERROR)
      )
      process.removeListener('err', handlers.get(HANDLER_KEY_OF_ERROR))

      // get instance of web application
      const app = this.WebApplication

      // remove application error event
      if (app) app.removeListener('error', handlers.get(HANDLER_KEY_OF_ERROR))
    }
  }


}

module.exports = LoggerApp
