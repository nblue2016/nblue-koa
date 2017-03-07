// reference libraries
const core = require('nblue-core')

// use class
const Component = require('./model')
const UUID = core.UUID
const co = core.co

// define constrants
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
    // get instance of logger
    const logger = this.getLogger()

    if (!this.IsCreated) {
      if (logger) {
        // append warning message to logger
        logger.warning(
          'The session component wasn\'t created before use.'
        )
      }

      // return empty middleware
      return this.createEmptyMW()
    }

    // get instance of data application
    const dt = this.getComponentByName('data')

    // define function to generate session
    const generateIdFunc = this.generateSessionId.bind(this)

    // define function to generate session
    const generateFunc = this.generateSession.bind(this)

    // define function to save session to database
    const saveFunc = this.saveSession.bind(this)

    // return middleware function
    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of cookies and request
      const cookies = ctx.cookies
      const req = ctx.request

      // declare empty session identity
      let sid = null

      // try to get session identity from cookies or request
      sid = cookies ? cookies.get('sid') : req.query.sid

      // generate new session identity if it wasn't found
      if (!sid) sid = generateIdFunc()

      // create session with identity from database
      const session = yield generateFunc(dt, sid)

      // bind session to context
      ctx.session = session

      // pass other middlewares
      yield next

      // save changed session to database
      yield saveFunc(dt, session)

      // save new session identity to cookies
      if (cookies) {
        cookies.set('sid', session ? session.id : null)
      }
    }
  }

  express () {
    // get instance of logger
    const logger = this.getLogger()

    if (!this.IsCreated) {
      if (logger) {
        // append warning message to logger
        logger.warning(
          'The session component wasn\'t created before use.'
        )
      }

      // return empty middleware
      return this.createEmptyMW()
    }

    // get instance of data application
    const dt = this.getComponentByName('data')

    // define function to generate session
    const generateIdFunc = this.generateSessionId.bind(this)

    // define function to generate session
    const generateFunc = this.generateSession.bind(this)

    // define function to save session to database
    const saveFunc = this.saveSession.bind(this)

    // return middleware function
    return function (req, res, next) {
      // get instance of cookies and request
      const cookies = req.cookies

      // declare empty session identity
      let sid = null

      // try to get session identity from cookies or request
      sid = cookies ? cookies.get('sid') : req.query.sid

      // generate new session identity if it wasn't found
      if (!sid) sid = generateIdFunc()

      co(function *() {
        // create session with identity from database
        const session = yield generateFunc(dt, sid)

        // bind session to context
        req.session = session

        try {
          return next()
        } finally {
          // save changed session to database
          yield saveFunc(dt, session)

          // save new session identity to cookies
          if (cookies) {
            cookies.set('sid', session ? session.id : null)
          }
        }
      })
    }
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
