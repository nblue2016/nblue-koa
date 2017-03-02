// reference libraries
const core = require('nblue-core')

// use classes
const Component = require('../../lib/components/logger')
const C = console

class Logger extends core.Logger {

  get Test () {
    return 'OK'
  }

  log (level, message, options) {
    // output error message to console
    if (level === 1) {
      C.log(message)
      if (options) {
        C.log(JSON.stringify(options, null, 2))
      }
    }

    // call super method
    super.log(level, message, options)
  }

}


class LoggerComponent extends Component {

  createLoggerInstance (outputter) {
    return new Logger(outputter)
  }

}


module.exports = LoggerComponent
