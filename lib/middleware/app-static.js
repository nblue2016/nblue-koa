
const serve = require('koa-static')
const SuperApp = require('./app-super')

class StaticApp extends SuperApp {

  create () {
    // get instance of config and logger
    const webConfig = this.WebConfig
    const logger = this.Logger

    // get static paths that defined in configuration file
    const paths = webConfig.getArray('statics')

    // if paths was found
    if (paths && paths.length > 0) {
      // fetch every path that defined in config
      paths.forEach((path) => {
        // use static path for server
        this.WebApplication.use(serve(path))

        // append it to logger
        if (logger) logger.verbose(`bind path:${path} to static route`)
      })
    }
  }

}

module.exports = StaticApp
