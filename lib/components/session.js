// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Component = require('./model')

const UUID = core.UUID

// define constants
const APP_NAME = 'session'
const CONFIG_KEY_OF_EXPIRE = 'expire'
const CONFIG_KEY_OF_ENCODE = 'encode'


const DEFAULT_VALUE_EXPIRE = 120000
const DEFAULT_VALUE_ENCODE = false

class SessionComponent extends Component {

  constructor (nblue) {
    super(nblue, { name: 'cache' })

    this._cache = null
  }

  get ModelName () {
    return APP_NAME
  }

  get ModelSchemas () {
    const database = this.Database
    const collection = this.ModelName

    return {
      session: {
        model: {
          sid: String,
          body: String,
          expire: Date
        },
        options: {
          database,
          collection,
          hidden: true
        }
      }
    }
  }

  get Expire () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_EXPIRE,
      DEFAULT_VALUE_EXPIRE
    )
  }

  get Encode () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_ENCODE,
      DEFAULT_VALUE_ENCODE
    )
  }

  koa () {
    // check current component was created or not
    if (!this.check()) return null

    // define generator function for middleware
    const gen = function *(ctx, next) {
      // get request from context
      const req = ctx.request

      // get cookie from context
      const cookies = ctx.cookies

      // try to get session identity from cookie or request
      const sid = cookies && cookies.get('sid')
        ? cookies.get('sid')
        : this.getSessionId(req)

      // get instance of session
      ctx.session = this.getSession(sid)

      // save session identity to cookies
      cookies.set('sid', sid)

      yield next

      return this.saveSession(sid, ctx.session)
    }.bind(this)

    // return a middleware
    return function *(next) {
      // get instance of context
      const ctx = this

      // execute generator function
      return yield gen(ctx, next)
    }
  }

  koa2 () {
    // check current component was created or not
    if (!this.check()) return null

    const saveSession = this.saveSession.bind(this)

    const gen = function (ctx, next) {
      // get request from context
      const req = ctx.request

      // get cookie from context
      const cookies = ctx.cookies

      // try to get session identity from cookie or request
      const sid = cookies && cookies.get('sid')
        ? cookies.get('sid')
        : this.getSessionId(req)

      // get instance of session
      ctx.session = this.getSession(sid)

      // save session identity to cookies
      cookies.set('sid', sid)

      return next().then(() => {
        saveSession(sid, ctx.session)
      })
    }.bind(this)

    return function (ctx, next) {
      // execute generator function
      return gen(ctx, next)
    }
  }

  express () {
    // check current component was created or not
    if (!this.check()) return null

    // get instance of nblue application
    const nblue = this.NBlue

    // define function to save session to cache
    const saveSession = this.saveSession.bind(this)

    // return middleware function
    const md = function (req, res, next) {
      // get cookie from request
      const cookies = req.cookies

      // try to get session identity from cookie or request
      const sid = cookies && cookies.sid
        ? cookies.sid
        : this.getSessionId(req)

      // get instance of session
      const session = this.getSession(sid) || {}

      // save session identity to cookies
      if (cookies) res.cookie('sid', sid)

      // save session
      nblue.once(
        Constants.EventOfSessionEnd,
        () => saveSession(sid, session)
      )

      next()
    }

    return md.bind(this)
  }

  getSessionId (req) {
    // try to get session identity from request
    if (req.query && req.query.sid) return req.query.sid

    // generate new sesion identity
    return this.generateSessionId()
  }

  getSession (sid) {
    // get instance of cache
    const cache = this.ModelCache

    // get session data from cache
    const data = cache.getItem(sid)

    // found data from session
    if (data) {
      // remove session from cache by session identity
      if (!data.body ||
          data.expire && Date.now() > data.expire) {
        cache.remove(sid)
      } else {
        // convert body to session
        return this.Encode ? this.decode(data.body) : data.body
      }
    }

    // return session or null value
    return {}
  }

  saveSession (sid, session) {
    // get instance of cache
    const cache = this.ModelCache

    // create new instance of cache data
    const data = {
      id: sid,
      body: this.Encode ? this.encode(session) : session,
      expired: Date.now() + this.Expire
    }

    // save session to cache
    cache.setItem(sid, data, this.Expire)
  }

  generateSessionId () {
    return UUID.generate('v4')
  }

  decode (body) {
    return JSON.parse(body)
  }

  encode (body) {
    return JSON.stringify(body)
  }

}

module.exports = SessionComponent
