const serve = require('koa-static')

class StaticApp {

  constructor (app) {
    this._app = app
  }

  get App () {
    return this._app
  }

  koa () {
    this.bindPaths('koa')

    return function *(next) {
      return yield next
    }
  }

  bindPaths (type) {
    const app = this.App
    const ctx = app.context

    const config = ctx.config
    const items = config.get('statics')

    if (items) {
      const paths = Array.isArray(items) ? items : [items]

      if (type === 'koa') {
        paths.map((path) => app.use(serve(path)))
      }
    }
  }

}

module.exports = StaticApp
