// use libraries
const core = require('nblue-core')
const Express = require('express')
const Application = require('./application')

const co = core.co

// define constrants
const NAPPLICATION_SERVER_TYPE = 'express'

class KoaApplication extends Application {

  constructor (app) {
    super(app || new Express())
  }

  get ServerType () {
    return NAPPLICATION_SERVER_TYPE
  }

  use () {
    // get instance of koa
    const app = this.Application

    // define function for apply components method
    const applyFunc = this.applyComponents.bind(this)

    // co a generator function
    return co(function *() {
      // call koa method for every component
      const mws = yield applyFunc('express', { key: 'middlewares' })

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

}

module.exports = KoaApplication
