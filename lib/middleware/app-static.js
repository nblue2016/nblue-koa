
const serve = require('koa-static')
const SuperApp = require('./app-super')

class StaticApp extends SuperApp {

  koa () {
    this.bindPaths('koa')

    return function *(next) {
      return yield next
    }
  }

  bindPaths (type) {
    // assign this to that
    const that = this

    // get static paths that defined in configuration file
    const paths = that.Config.getArray('statics')

    if (type === 'koa') {
      if (paths) {
        paths.map((path) => that.Application.use(serve(path)))
      }
    }
  }

}

module.exports = StaticApp
