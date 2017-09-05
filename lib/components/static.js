// reference libraries
const Constants = require('.././constants')
const Component = require('./super')

const ConfigKeyOfPaths = 'paths'

class StaticComponent extends Component {

  constructor (nblue) {
    // invoke super constructor
    super(nblue, { name: 'static' })
  }

  // the super create methods will return a promise so define _create method,
  // it was invoked when call super create method
  _create () {
    // get instance of config
    const config = this.Config

    // exit if there is no paths definition
    if (!config.has(ConfigKeyOfPaths)) return

    // get static paths that defined in configuration file
    const paths = config.getArray(ConfigKeyOfPaths)

    // get instance of koa application
    const app = this.Application

    // get instance of logger
    const logger = this.getLogger()

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
      const pathOpts = {}

      // if found options in path section, copy these
      if (typeof path === 'object' && path.has('options')) {
        Object.assign(pathOpts, path.get('options').toObject())
      }

      try {
        // use middle ware for static path by root name
        app.use(this.getMW(root, pathOpts))

        // append path info to logger
        if (logger) {
          logger.verbose(`append path: ${root} to static route.`)
        }
      } catch (err) {
        // append error to logger
        if (logger) {
          logger.error(`append path: ${root} to static route failed.`, err)
        }
      }
    }
  }

  // the method return static middleware for different server
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
