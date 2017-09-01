// reference libraries
const Constants = require('.././constants')
const Component = require('./super')

class StaticComponent extends Component {

  create () {
    // get instance of config
    const config = this.AppConfig

    // get instance of logger
    const logger = this.getLogger()

    // get static paths that defined in configuration file
    const paths = config.getArray('statics')

    // get instance of koa application
    const app = this.Application

    // fetch all paths in definition
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
        app.use(this.getMW(root, opts))

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

  getMW (path, opts) {
    // declare
    let mw = null

    // get server type of web server
    const serverType = this.ServerType.toLowerCase()

    switch (serverType) {
    case Constants.ServerOfExpress: {
      // get class of express
      const express = require('express')

      // get static module from express
      mw = express.static
      break
    }
    case Constants.ServerOfKoa:
    case Constants.ServerOfKoa2: {
      // use extend module koa-static
      mw = require('koa-static')
      break
    }
    default:
      throw new Error(`doesn't supported static module for ${serverType}`)
    }

    // return middleware
    return mw(path, opts)
  }

}

module.exports = StaticComponent
