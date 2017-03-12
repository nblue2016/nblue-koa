// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Component = require('./model')

const Cache = core.Cache
const UUID = core.UUID

// define constants
const APP_NAME = 'session'
const CACHE_KEY_OF_SESSION = '~session'
const CONFIG_KEY_OF_EXPIRE = 'expire'


const DEFAULT_VALUE_EXPIRE = 1000

class SessionComponent extends Component {

  constructor (nblue) {
    super(nblue)

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

  get Cache () {
    if (!this._cache) {
      // try to get instance of cache component
      const cacheComp = this.getComponentByName('cache')

      // try to get session cache from cache component
      if (cacheComp) {
        this._cache = cacheComp.getCacheByName(CACHE_KEY_OF_SESSION)
      }

      if (!this._cache) {
        this._cache = new Cache()
      }
    }

    return this._cache
  }

  koa () {
    // check current component was created or not
    if (!this.check()) return null

    const generateSessionId = this.generateSessionId.bind(this)

    // define function to get session from cache
    const getSession = this.getSession.bind(this)

    // define function to save session to cache
    const saveSession = this.saveSession.bind(this)

    // return middleware function
    return function *(next) {
      // get instance of context
      const ctx = this

      // declare
      let sid = null

      // get request from context
      const req = ctx.request

      // get cookie from context
      const cookies = ctx.cookies

      // try to get session identity from cookie or request
      if (cookies) sid = cookies.get('sid')
      if (!sid) sid = req.sid
      if (!sid) sid = generateSessionId()

      // get instance of session
      const session = getSession(sid)

      // keep session to context
      ctx.session = session || {}

      // save session identity to cookies
      cookies.set('sid', sid)

      yield next

      saveSession(sid, ctx.session)
    }
  }

  koa2 () {
    // check current component was created or not
    if (!this.check()) return null

    const generateSessionId = this.generateSessionId.bind(this)

    // define function to get session from cache
    const getSession = this.getSession.bind(this)

    // define function to save session to cache
    const saveSession = this.saveSession.bind(this)

    // return middleware function
    return function (ctx, next) {
      // declare
      let sid = null

      // get request from context
      const req = ctx.request

      // get cookie from context
      const cookies = ctx.cookies

      // try to get session identity from cookie or request
      if (cookies) sid = cookies.get('sid')
      if (!sid) sid = req.sid
      if (!sid) sid = generateSessionId()

      // get instance of session
      const session = getSession(sid)

      // keep session to context
      ctx.session = session || {}

      // save session identity to cookies
      cookies.set('sid', sid)

      return next().
        then(() => saveSession(sid, ctx.session))
    }
  }


  express () {
    // check current component was created or not
    if (!this.check()) return null

    // get instance of nblue application
    const nblue = this.NBlue

    const generateSessionId = this.generateSessionId.bind(this)

    // define function to get session from cache
    const getSession = this.getSession.bind(this)

    // define function to save session to cache
    const saveSession = this.saveSession.bind(this)

    // return middleware function
    return function (req, res, next) {
      // declare
      let sid = null

      // get cookie from request
      const cookies = req.cookies

      // try to get session identity from cookie or request
      if (cookies) sid = cookies.sid
      if (!sid) sid = req.sid
      if (!sid) sid = generateSessionId()

      // get instance of session
      const session = getSession(sid) || {}

      // save session identity to cookies
      res.cookie('sid', sid)

      nblue.once(
        Constants.EventOfSessionEnd,
        () => saveSession(sid, session)
      )

      next()
    }
  }

  getSession (sid) {
    // get instance of cache
    const cache = this.Cache

    // get session data from cache
    const data = cache.getItem(sid)

    let session = null

    if (data) {
      // remove session from cache by session identity
      if (!data.body || data.expire && Date.now() > data.expire) {
        cache.setItem(sid, null, 0)
      } else {
        // convert body to session
        session = data.body
      }
    }

    // return session or null value
    return session
  }

  saveSession (sid, session) {
    // get instance of cache
    const cache = this.Cache

    // create new instance of cache data
    const data = {
      id: sid,
      body: session,
      expired: this.Expire
    }

    // save session to cache
    cache.setItem(sid, data, data.expired)
  }

  *processSession (options) {
    // assign options to opts
    const opts = options || {}

    // get cookies and request from options
    const { cookies, req } = opts

    // check request
    if (!req) throw ReferenceError('req')

    // try to get session identity from cookies or request
    // otherware generate new identity for session
    const sid = cookies && typeof cookies.get === 'function'
      ? cookies.get('sid')
      : req.query.sid || this.generateSessionId()

    // get data component
    const dt = this.getDataComponent()

    // create session with identity from database
    const session = yield this.generateSession(dt, sid)

    // bind session to context
    if (session) {
      // get instance of nblue application
      const nblue = this.NBlue

      // define function to save session
      const saveFunc = this.saveSession.bind(this)

      // catch session end event to save session
      nblue.once(Constants.EventOfSessionEnd, () => {
        saveFunc(dt, session).
          then(() => {
            // save new session identity to cookies
            if (cookies && typeof cookies.set === 'function') {
              cookies.set('sid', session ? session.id : null)
            }
          })
      })
    }

    // bind session to request
    return session
  }

  generateSessionId () {
    return UUID.generate('v4')
  }

  /* generateSession (dt, sid) {
    // get model name of session
    const name = this.ModelName

    // define function to decode session body
    const decodeFunc = this.decode.bind(this)

    // define function to generate session
    const generateIdFunc = this.generateSessionId.bind(this)

    // define session to get session from database by sid
    const getFunc = (adapter) => {
      // define generator function
      const gen = function *() {
        // get instance session from database by identity
        const data = dt.one(yield adapter.retrieve({ sid }))

        // check the session is expired or not
        if (data && (!data.body ||
                      data.expire && Date.now() > data.expire)) {
          // delete session data in database
          yield adapter.delete({ sid })

          // clear expired session
          return null
        }

        // return instance of session
        return data
      }

      return co(gen)
    }

    // execute database command
    return dt.
      pexecute(name, getFunc).
      then((data) => {
        // return session data with decode body
        if (data && data.body) return decodeFunc(data.body)

        // generate uuid to return new session
        return { id: generateIdFunc() }
      })
  }

  saveSession (dt, session) {
    // get model name of session
    const name = this.ModelName

    // get identity of session
    const sid = session.id

    // get body of session data
    const body = this.encode(session)

    // get expire time of session data
    const expire = Date.now() + this.Expire

    // define function to save session
    const saveFunc = (adapter) => {
      const gen = function *() {
        // delete old session by id
        yield adapter.delete({ sid })

        // create new item of session
        const sessionData = {
          sid,
          body,
          expire
        }

        // save new session to database
        return yield adapter.create(sessionData)
      }

      // return result
      return co(gen)
    }

    // save to database
    return dt.pexecute(name, saveFunc)
  }
*/

  decode (body) {
    return JSON.parse(body)
  }

  encode (body) {
    return JSON.stringify(body)
  }

}

module.exports = SessionComponent
