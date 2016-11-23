const serve = require('koa-static')

class StaticMW {

  koa (nkoa) {
    const app = nkoa.App
    const ctx = app.context
    const config = ctx.config
    const paths = config.get('statics')

    const gens = []

    if (paths) {
      if (Array.isArray(paths)) {
        paths.map((path) => gens.push(serve(path)))
      } else {
        gens.push(serve(paths))
      }
    }

    gens.forEach((item) => app.use(item))

    return function *(next) {
      yield next
    }
  }

}

module.exports = StaticMW
