
const serve = require('koa-static')
const SuperApp = require('./app-super')

class StaticApp extends SuperApp {

  create () {
    // assign this to that
    const that = this

    // get instance of koa application and config
    const app = that.Application
    const config = that.Config

    // get static paths that defined in configuration file
    const paths = config.getArray('statics')

    if (paths) {
      paths.map((path) => app.use(serve(path)))
    }
  }

  koa () {
    return function *(next) {
      return yield next
    }
  }

}

module.exports = StaticApp
