// reference libraries
const core = require('nblue-core')

// get constants definition
const Constants = require('.././constants')

// delcare base class for Component
const Component = require('./super')

// get modules from nblue core
const Logger = core.Logger
const StringBuilder = core.StringBuilder

// define constants
const HANDLER_KEY_OF_ERROR = 'error'
const HANDLER_KEY_OF_REJECTION = 'rejection'
const HANDLER_KEY_OF_WARNING = 'warning'

const CONFIG_KEY_OF_LOGGER = 'logger'

const CONFIG_KEY_OF_FILE = 'file'
const CONFIG_KEY_OF_LINE_FORMAT = 'lineFormat'
const CONFIG_KEY_OF_LEVELS = 'levels'
const CONFIG_KEY_OF_LEVEL = 'level'

class LoggerComponent extends Component {

  constructor (nblue) {
    super(nblue)

    this._name = 'logger'
    this._handlers = new Map()
  }

  get Handlers () {
    return this._handlers
  }

  create (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of nblue application
    const nblue = this.NBlue

    // create instance of outputter for logger
    const outputter = this.createOutputter(opts)

    // create new instance of logger
    const logger = this.createLogger(outputter, opts)

    // save instance of logger to nblue application cache
    nblue.saveToCache(Constants.KeyOfLogger, logger)

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

  // the function will implement a middleware for all server type
  // the logger middleware will record request infomation, includes path, ip
  // spend time etc.
  middleware (ctx, options) {
    // get instance of logger
    const logger = this.getLogger()

    // define function to generate output logger line
    const generateFunc = this.generateRequestLine

    // get time for start
    const start = new Date()

    // create function for session end
    const cbFunc = function () {
      // get request and response from context
      const { request, response } = ctx

      // generate optiosn for output line
      const opts = {
        url: request.originalUrl,
        ip: request.ip,
        method: request.method,
        session: request.session,
        status: response.statusCode,
        start
      }

      // append info to logger
      logger.info(generateFunc(opts))
    }

    // bind callback function to options
    options.callback = cbFunc.bind(ctx)
  }

  getLoggerConfig (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of config
    const config = this.NConfig

    // get config key of logger
    const configKey = opts.configKey || CONFIG_KEY_OF_LOGGER

    // get config section for logger
    return config && config.has(configKey)
      ? config.get(configKey)
      : new Map()
  }

  getLoggerFileName (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of logger config
    const loggerConfig = this.getLoggerConfig(opts)

    // return file name if found it in config
    if (loggerConfig.has(CONFIG_KEY_OF_FILE)) {
      return loggerConfig.get(CONFIG_KEY_OF_FILE)
    }

    // return file name if found it in options
    if (opts.file) return opts.file

    // return null if it wasn't found
    return null
  }

  createOutputter (options) {
      // assign options to opts
    const opts = options || {}

    // create new instance of outputter
    const outputter = opts.createOutputter
      ? opts.createOutputter(opts)
      : this.createOutputterInstance(opts)

    // define function for log details with arguments
    outputter.logMore = (args, items) => {
      // if args is instance of error, only output full error
      if (args instanceof Error) {
        outputter.log(`error (module: ${items.app}):`)
        outputter.log(args)
      } else if (Object.keys(args).length > 0) {
        // otherwise output args details
        outputter.log(`details (module: ${items.app}):`)
        try {
          outputter.log(`${JSON.stringify(args, null, 2)}`)
        } catch (err) {
          outputter.log(args)
        }
      }
    }

    // return instance of outputter
    return outputter
  }

  createOutputterInstance (options) {
    // assign options to opts
    const opts = options || {}

    // get log file name by options
    const filename = this.getLoggerFileName(opts)

    // return memory outputter if can't find file name for logger
    if (!filename) return Logger.createMemoryOutputter()

    // get base folder for web
    const base = this.NBlue.getBaseFolder()

    // return file outputter with relatively path
    if (!filename.startsWith('.')) {
      return Logger.createFileOutputter(filename)
    }

    // return file outputter with absolutely path
    return Logger.createFileOutputter(`${base}/${filename}`)
  }

  createLogger (outputter, options) {
    // assign options to opts
    const opts = options || {}

    // create new instance of logger
    const logger = this.createLoggerInstance(outputter)

    // get instance of logger config
    const loggerConfig = this.getLoggerConfig(opts)

    // set properies of logger
    // init properies of logger with options
    if (opts.lineFormat) logger.LineFormat = opts.lineFormat
    if (opts.level) logger.Level = opts.level
    if (opts.levels) {
      for (const [k, v] of opts.levels) {
        logger.setLogLevel(k, v)
      }
    }

    // assign function for logger
    if (opts.getLevelText) logger.getLevelText = opts.getLevelText
    if (opts.getMessageText) logger.getMessageText = opts.getMessageText

    // init properies of logger with config file
    // it will overwrite properies for options
    // set property of logger level
    if (loggerConfig.has(CONFIG_KEY_OF_LEVEL)) {
      logger.Level = loggerConfig.get(CONFIG_KEY_OF_LEVEL)
    }

    // set property of logger line format
    if (loggerConfig.has(CONFIG_KEY_OF_LINE_FORMAT)) {
      logger.LineFormat = loggerConfig.get(CONFIG_KEY_OF_LINE_FORMAT)
    }

    // set property of logger levels
    if (loggerConfig.has(CONFIG_KEY_OF_LEVELS)) {
      for (const [k, v] of loggerConfig.get(CONFIG_KEY_OF_LEVELS)) {
        logger.setLogLevel(k, v)
      }
    }

    // return instance of logger
    return logger
  }

  createLoggerInstance (outputter) {
    return new Logger(outputter)
  }

  generateHandlers (logger) {
    // define error handler
    const errHandler = (err) => {
      logger.error(`error(${err.name}) catched`, err)
    }

    // define rejection handler
    const rejectionHandler = (reason) => {
      logger.error(
          `rejection catched, details: ${reason}`, reason
        )
    }

    // define warning handler
    const warningHandler = (warning) => {
      logger.warning(
          `warning(${warning.name}) catched, details: ${warning.message}`,
          warning
        )
    }

    // appendd handler to map
    this._handlers.set(HANDLER_KEY_OF_ERROR, errHandler)
    this._handlers.set(HANDLER_KEY_OF_REJECTION, rejectionHandler)
    this._handlers.set(HANDLER_KEY_OF_WARNING, warningHandler)
  }

  generateRequestLine (options) {
    // assign options to opts
    const opts = options || {}

    // create new instance of string builder
    const sb = new StringBuilder()

    // append local ip address
    if (opts.ip) sb.appendFormat('ip (%s) ', opts.ip)

    // append request infomation
    sb.append(`FETCH ${opts.url || '/'} (`)

    // append method of HTTP
    if (opts.method) sb.appendFormat('%s, ', opts.method)

    // append response status
    if (opts.status) sb.appendFormat('%s, ', opts.status)

    // get instance of session from options
    const session = opts.session

    // append session identity
    if (session && session.id) {
      sb.appendFormat('sid:%s, ', session.id || '')
    }

    // calc spend time (mileseconds)
    if (opts.start) {
      sb.appendFormat('spend:%sms', new Date() - opts.start)
    }

    // append end symbol
    sb.append(')')

    // return full string
    return sb.toString()
  }

  bindHandlers () {
    // get defined handlers
    const handlers = this._handlers

    // bind error handlers
    if (handlers.has(HANDLER_KEY_OF_ERROR)) {
      // get instance of application
      const app = this.NApplication

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
      const app = this.NApplication

      // remove application error event
      if (app) app.removeListener('error', handlers.get(HANDLER_KEY_OF_ERROR))
    }
  }

}

module.exports = LoggerComponent
