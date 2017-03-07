// use libraries
const core = require('nblue-core')
const Express = require('express')
const Application = require('./application')

const co = core.co

// define constrants
const NAPPLICATION_SERVER_TYPE = 'express'

class KoaApplication extends Application {

  constructor (app) {
    super(app || Express())
  }

  get ServerType () {
    return NAPPLICATION_SERVER_TYPE
  }

  use () {
    // get instance of koa
    const app = this.Application

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // define function to output response
    const respondFunc = this.respond.bind(this)

    // create a simple middleware to bind start time
    app.use((req, res, next) => {
      // bind start time to request
      req.start = new Date()

      // invoke next middlewares
      return next()
    })

    // co a generator function
    return co(function *() {
      // call koa method for every component
      const mws = yield applyFunc('express', { key: 'middlewares' })

      // fetch every middleware
      mws.forEach((mw) => app.use(mw))

      app.use((err, req, res, next) => {
        if (!err) return next()

        return res.send('err')
      })

      app.get('/', (req, res) => {
        respondFunc({
          req,
          res,
          body: {
            message: 'ok',
            body: 'body'
          }
        })
      })

      // return a Promise
      return Promise.resolve()
    })
  }

  createServer () {
    // get instance of nblue application
    const app = this.Application

    // return new instance of server
    return super.createServer(app)
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
        erespond(opts)
    }
  }

}

module.exports = KoaApplication
