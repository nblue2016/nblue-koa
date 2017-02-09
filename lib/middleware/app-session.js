const core = require('nblue-core')
const ModelApp = require('./app-model')

const UUID = core.UUID
const co = core.co

const APP_NAME = 'session'

// const ONE_DAY = 24 * 60 * 60 * 1000
const CONFIG_KEY_OF_EXPIRE = 'expire'
const DEFAULT_VALUE_EXPIRE = 1000

class SessionApp extends ModelApp
{

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
          collection
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

  modelCreate () {
    return
  }

  koa () {
    const that = this

    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of cookies and request
      const cookies = ctx.cookies
      const req = ctx.request

      // declare
      let sid = null

      // try to get session identity from cookies or request
      sid = cookies ? cookies.get('sid') : req.query.sid

      // generate new session identity if it wasn't found
      if (!sid) sid = that.generateSessionId()

      // create session with identity from database
      const session = yield that.generateSession(sid)

      // bind session to context
      ctx.session = session

      // pass other middlewares
      yield next

      // save changed session to database
      yield that.saveSession(session)

      // save new session identity to cookies
      if (cookies) {
        cookies.set('sid', session ? session.id : null)
      }
    }
  }

  generateSessionId () {
    return UUID.generate('v4')
  }

  generateSession (sid) {
    // assign this to that
    const that = this

    return function *() {
      // declare variant
      let rt = null

      // get instance of data application
      const dataApp = that.getAppByName('data')

      // declare a function to get session from databasae
      const getSessionById =
        (id) =>
          (adapter) => co(function *() {
            // get instance session from database by identity
            rt = yield adapter.retrieve({ sid: id })

            // convert result from database
            if (rt && Array.isArray(rt) && rt.length > 0) {
              rt = rt[0]
            }

            // check the session is expired or not
            if (rt && rt.expire && Date.now() > rt.expire) {
              // delete session data in database
              yield adapter.delete({ sid: id })

              // clear expired session
              rt = null
            }
          })

      // execute database command
      yield dataApp.execute(that.ModelName, getSessionById(sid))

      // return a session from database or create a new one
      return rt ? that.decode(rt.body) : { id: that.generateSessionId() }
    }
  }

  saveSession (session) {
    // assign this to that
    const that = this

    // get session identity
    const sid = session.id

    return function *() {
      // get instance of data application
      const dataApp = that.getAppByName('data')

      // save to database
      yield dataApp.execute(
        that.ModelName,
        (adapter) => co(function *() {
          yield adapter.delete({ sid })

          const item = {
            sid,
            body: that.encode(session),
            expire: Date.now() + that.Expire
          }

          yield adapter.create(item)
        })
      )
    }
  }

  decode (body) {
    return JSON.parse(body)
  }

  encode (body) {
    return JSON.stringify(body)
  }

}

module.exports = SessionApp
