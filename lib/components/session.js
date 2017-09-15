// reference libraries
const core = require('nblue-core')

// use class
const Constants = require('.././constants')
const Component = require('./super')

const aq = core.aq
const co = core.co
const Cache = core.Cache
const UUID = core.UUID

// define constants
const COMPONENT_NAME = 'session'
const CONFIG_KEY_OF_EXPIRE = 'expire'
const CONFIG_KEY_OF_ENCODE = 'encode'

const COOKIE_KEY_OF_SESSION_ID = 'encode'

const DEFAULT_VALUE_EXPIRE = 120000
const DEFAULT_VALUE_ENCODE = false

class SessionComponent extends Component {

  // define constructor function
  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // add component name to options
    if (!opts.name) opts.name = COMPONENT_NAME

    // invoke super constructor
    super(nblue, options)
  }

  get Expire () {
    // get settings for current component
    const settings = this.Settings

    // return value by key
    return settings.get(
      CONFIG_KEY_OF_EXPIRE,
      DEFAULT_VALUE_EXPIRE
    )
  }

  get Encode () {
    // get settings for current component
    const settings = this.Settings

    // return value by key
    return settings.get(
      CONFIG_KEY_OF_ENCODE,
      DEFAULT_VALUE_ENCODE
    )
  }

  middleware (ctx, options) {
    // check for arguments
    if (!ctx) throw ReferenceError('ctx')

    // assign options to opts
    const opts = options || {}

    // get session identity from context
    const sid = this.getSessionId(ctx)

    // can't get session identity, the session component was disabled
    if (!sid) return Promise.resolve()

    // create generator function to process session
    const gen = function *() {
      // get session data by identity
      const session = yield aq.then(this.getSessionById(sid))

      if (session) {
        // bind session to context
        yield aq.then(this.bindSession(ctx, session))

        // save session identity to context
        this.saveSessionId(ctx, sid)

        // get function for save session data
        const saveFunc = this.saveSession.bind(this)

        // set callback for current middleware
        opts.callback = () => {
          saveFunc(sid, session)
        }
      }
    }

    // co a generator function
    return co(gen.bind(this))
  }

  _create () {
    this._cache = this.createCache()
  }

  createCache () {
    // get key of cache
    const cacheKey = `~${this.Name}`

    // create new instance of cache if it wasn't created
    // try to get instance of cache component
    const cacheComp = this.getComponentByName('cache')

    // try to get session cache from cache component
    if (cacheComp) {
      // try to get cache from cache component
      const cache = cacheComp.getCacheByName(cacheKey)

      // return cache if it was found
      if (cache) return cache
    }

    // return new original cache
    return new Cache()
  }

  getCache () {
    // check private instance of cache was created or not
    if (!this._cache) {
      this._cache = this.createCache()
    }

    // return instance of cache
    return this._cache
  }

  getSessionId (ctx) {
    // get request from context
    const { request } = ctx

    // try to get cookies from context or request
    const cookies = ctx.cookies

    // delcare session
    let sid = null

    // try ot get session identity from cookie
    if (cookies) {
      sid = ctx.cookies.get(COOKIE_KEY_OF_SESSION_ID)
    }

    // try to get session identity from request
    if (!sid) {
      if (request.query) sid = request.query.sid
    }

    // create random session identity
    if (!sid) sid = this.generateSessionId()

    // return value
    return sid
  }

  getSessionById (sid) {
    // get instance of cache
    const cache = this.getCache()

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

  generateSessionId () {
    // create session identity with UUID
    return UUID.generate('v4')
  }

  bindSession (ctx, session) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!session) throw ReferenceError('session')

    // get request from context
    const { request } = ctx

    switch (this.ServerType) {
    case Constants.ServerOfExpress:
      request.session = session
      ctx.session = session
      break
    default:
      ctx.session = session
      break
    }
  }

  saveSessionId (ctx, sid) {
    // check for arguments
    if (sid) {
      const cookies = ctx.cookies

      if (cookies) {
        cookies.set(COOKIE_KEY_OF_SESSION_ID, sid)
      }
    }
  }

  saveSession (sid, session) {
    // get instance of cache
    const cache = this.getCache()

    // create new instance of cache data
    const data = {
      id: sid,
      body: this.Encode ? this.encode(session) : session,
      expired: Date.now() + this.Expire
    }

    // save session to cache
    cache.setItem(sid, data, this.Expire)
  }

  decode (body) {
    return JSON.parse(body)
  }

  encode (body) {
    return JSON.stringify(body)
  }

}

module.exports = SessionComponent
