// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Component = require('./model')
const UUID = core.UUID
const co = core.co

// define constants
const APP_NAME = 'session'
const CONFIG_KEY_OF_EXPIRE = 'expire'
const DEFAULT_VALUE_EXPIRE = 1000

class SessionComponent extends Component {

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

  koa () {
    // check current component was created or not
    if (!this.check()) return null

    // define generator function for process session
    const gen = this.processSession.bind(this)

    // return middleware function
    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of cookies and request
      const opts = { req: ctx.request, cookies: ctx.cookies }

      // get session
      const session = yield co(gen(opts))

      // bind session to context
      if (session) ctx.session = session

      // invoke next middlewares
      return yield next
    }
  }

  koa2 () {
    // check current component was created or not
    if (!this.check()) return null

    // define generator function for process session
    const gen = this.processSession.bind(this)

    // return middleware function
    return (ctx, next) => {
      // get instance of cookies and request
      const opts = { req: ctx.request, cookies: ctx.cookies }

      // get session
      return co(gen(opts)).
        then((session) => {
          // bind session to context
          if (session) ctx.session = session
        }).
        then(() => next())
    }
  }

  express () {
    // check current component was created or not
    if (!this.check()) return null

    // define generator function for process session
    const gen = this.processSession.bind(this)

    // return middleware function
    return function (req, res, next) {
      // get instance of cookies and request
      const opts = { req, cookies: req.cookies }

      // co a generator function to get a Promise
      return co(gen(opts)).
        then((session) => {
          // bind session to requst
          if (session) req.session = session
        }).
        then(() => next())
    }
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
    const sid = cookies
      ? cookies.get('sid')
      : req.query.sid || this.generateSessionId()

    // get data component
    const dt = this.getDataComponent()

    // create session with identity from database
    const session = yield this.generateSession(dt, sid)

    // bind session to context
    if (session) {
      // get instance of nblue application
      const napp = this.NApp

      // define function to save session
      const saveFunc = this.saveSession.bind(this)

      // catch session end event to save session
      napp.once(Constants.EventOfSessionEnd, () => {
        saveFunc(dt, session).
          then(() => {
            // save new session identity to cookies
            if (cookies) {
              // cookies.set('sid', session ? session.id : null)
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

  generateSession (dt, sid) {
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

  decode (body) {
    return JSON.parse(body)
  }

  encode (body) {
    return JSON.stringify(body)
  }

}

module.exports = SessionComponent
