const nblue = require('nblue')
const Logger = nblue.Logger
const StringBuilder = nblue.StringBuilder

/*
*/
const create = (config, options) => {
  const opts = options || {}
  const key = opts.configKey || 'logger'

  // generate function for outputter
  const outputter = () => {
    if (opts.createOutputter) {
      return opts.createOutputter()
    }

    let logFile = null

    if (config && config.has(key)) {
      const conf = config.get(key)

      if (conf.has('file')) logFile = conf.get('file')
    }

    if (opts.file) logFile = opts.file

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

  // init properies for logger
  if (opts.lineFormat) logger.LineFormat = opts.lineFormat
  if (opts.level) logger.Level = opts.level
  if (opts.levels) {
    for (const [k, v] of opts.levels) {
      logger.setLogLevel(k, v)
    }
  }

  if (opts.getLevelText) logger.getLevelText = opts.getLevelText
  if (opts.getMessageText) logger.getMessageText = opts.getMessageText

  if (config && config.has(key)) {
    const conf = config.get(key)

    if (conf.has('level')) logger.Level = conf.get('level')
    if (conf.has('lineFormat')) logger.LineFormat = conf.get('lineFormat')
    if (conf.has('levels')) {
      const levels = conf.get('levels')

      for (const [k, v] of levels) {
        logger.setLogLevel(k, v)
      }
    }
  }

  return logger
}

const koa = function () {
  return function *(next) {
    const start = new Date()
    const ctx = this
    const logger = ctx.logger ? ctx.logger : null

    if (!logger) return

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

    // bind error and warning handlers
    // app.on('error', errHandler)
    process.on('err', errHandler)
    process.on('uncaughtException', errHandler)
    process.on('unhandledRejection', rejectionHandler)
    process.on('warning', warningHandler)

    yield next

    const sb = new StringBuilder()

    sb.append(ctx.url)
    sb.append(' (')
    sb.appendFormat('%s, ', ctx.method)
    sb.appendFormat('%s, ', ctx.status)
    if (ctx.session && ctx.session.id) {
      sb.appendFormat('sid:%s, ', ctx.session.id)
    }
    sb.appendFormat(':%sms', new Date() - start)
    sb.append(')')

    logger.verbose(sb.toString())
    // `${ctx.url} (${ctx.method}, ${ctx.status}, :${ms}ms)`

    // remove error and warning handlers
    process.removeListener('warning', warningHandler)
    process.removeListener('unhandledRejection', rejectionHandler)
    process.removeListener('uncaughtException', errHandler)
    process.removeListener('err', errHandler)
      // app.removeListener('err', errHandler)
  }
}

module.exports = {
  create,
  koa
}
