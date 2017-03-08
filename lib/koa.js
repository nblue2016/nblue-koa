// use libraries
const core = require('nblue-core')
const Application = require('./application')

const co = core.co

// define constrants
const NAPPLICATION_SERVER_TYPE = 'koa'

class KoaApplication extends Application {

  constructor (app) {
    // declare koa
    const KOA = require('koa')

    super(app || new KOA())
  }

  get ServerType () {
    return NAPPLICATION_SERVER_TYPE
  }

  use () {
    // get instance of koa
    const app = this.Application

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // bind start date to request
    app.use(function *(next) {
      // get instance of context
      const ctx = this

      // bind start time to context
      ctx.start = new Date()

      // invoke next middleware
      return yield next
    })

    // co a generator function
    return co(function *() {
      // call koa method for every component
      const mws = yield applyFunc('koa', { key: 'middlewares' })

      // fetch every middleware
      mws.forEach((mw) => app.use(mw))

      // return a Promise
      return Promise.resolve()
    })
  }

  createServer () {
    // get instance of nblue application
    const app = this.Application

    // return new instance of server
    return super.createServer(app.callback())
  }

  respond (options) {
    // get instance of application manager
    const comgr = this.ComponentManager

    // assign options to opts
    const opts = options || {}

    // get type of response
    const responseType = 'json'

    // response result by type
    switch (responseType) {
    // case 'xml':
    case 'json':
    default:
      return comgr.
        getComponent('json').
        krespond(opts)
    }
  }

}

module.exports = KoaApplication