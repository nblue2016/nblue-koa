// reference libraries
const Constants = require('.././constants')
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

    for (const path of paths) {
      // get root from path
      const root =
        typeof path === 'object' && path.has('root')
          ? path.get('root')
          : path

      // ignore if can't find root folder for static
      if (!root) continue

      // create object for options
      const opts = {}

      // if found options in path section, copy these
      if (typeof path === 'object' && path.has('options')) {
        Object.assign(opts, path.get('options').toObject())
      }


      try {
        // use middle ware for static path
        app.use(this.getMiddleWare(root, opts))

        // append it to logger
        if (logger) {
          logger.verbose(`append path: ${root} to static route.`)
        }
      } catch (err) {
        if (logger) {
          logger.error(`append path: ${root} to static route failed.`, err)
        }
      }
    }
  }

  getMiddleWare (path, opts) {
    switch (this.ServerType.toLowerCase()) {
    case Constants.ServerOfExpress: {
      const express = require('express')
      const mw = express.static

      return mw(path, opts)
    }
    case Constants.ServerOfKoa:
    case Constants.ServerOfKoa2: {
      const mw = require('koa-static')

      return mw(path, opts)
    }
    default:
      return null
    }
  }

}

module.exports = StaticComponent
