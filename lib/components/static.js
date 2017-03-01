// reference libraries
const Component = require('./super')

class StaticComponent extends Component {

  create () {
    // get instance of config
    const webConfig = this.WebConfig

    // get instance of logger
    const logger = this.getLogger()

    // get static paths that defined in configuration file
    const paths = webConfig.getArray('statics')

    // get instance of koa application
    const app = this.WebApplication

    // define function to get static middleware
    const getMWFunc = this.getMiddleWare.bind(this)

    // if paths was found
    if (paths && paths.length > 0) {
      // fetch every path that defined in config
      paths.forEach((path) => {
        // get instance of middleware for static
        const mw = getMWFunc()

        // use static path for server
        app.use(mw(path))

        // append it to logger
        if (logger) {
          logger.verbose(`append path: ${path} to static route`)
        }
      })
    }
  }

  getMiddleWare () {
    switch (this.ServerType.toLowerCase()) {
    case 'koa':
    default:
      return require('koa-static')
    }
  }

}

module.exports = StaticComponent
