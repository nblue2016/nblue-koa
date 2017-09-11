// reference libraries
const core = require('nblue-core')

// use classes
const Component = require('./session')
const aq = core.aq
const co = core.co

class SessionComponent extends Component {

  constructor (nblue) {
    super(nblue, { name: 'session' })

    this._client = null
  }

  get Client () {
    return this._client
  }

  getPackages () {
    return ['ioredis']
  }

  _create () {
    // create options for connection
    const csOpts = {
      name: this.Name,
      config: this.Config
    }

    // get instance of data component
    const dc = this.getComponentByName('data')

    // get connection string for current component
    const cs = dc.getConnectoinStringWithOptions(csOpts)

    // check connection string
    if (!cs) {
      throw new Error("can't find connection string for redis-session.")
    }

    // check type of connection string
    if (typeof cs === 'object') {
      // create new options for redis server
      const opts = cs.has('options') ? cs.get('options').toObject() : {}

      // create redis client with options
      this._client = this.createClient(opts)
    } else {
      // create redis client with connection string
      this._client = this.createClient(cs)
    }
  }

  createClient (options) {
    // assign options to opts
    const opts = options || {}

    // use class
    const Redis = require('ioredis')

    // create new instance of redis client
    return new Redis(opts)
  }

  getSessionKey (sid) {
    // check for argument
    return `session:sid:${sid}`
  }

  getSessionById (sid) {
    // check for argument
    if (!sid) throw new ReferenceError('sid')

    // create generator function to get session from redis server
    const gen = function *() {
      // get session key save in redis by session identity
      const sessionKey = this.getSessionKey(sid)

      // get redis client
      const client = this.Client

      // check current session was saved in redis by session key
      const exists = yield client.exists(sessionKey)

      // create empty session
      const session = {}

      // get session items from redis server if it was found
      if (exists === 1) {
        // get keys for current session
        const redisSession = yield client.hgetall(sessionKey)

        // get all keys for session in redis
        const keys = Object.keys(redisSession)

        // if found keys, assign values
        if (keys.length > 0) {
          // fetch every key
          for (const key of keys) {
            // decode value from redis to session
            session[key] = this.decode(redisSession[key])
          }
        }
      }

      // return instance of session
      return Promise.resolve(session)
    }

    // execute function
    return co(gen.bind(this))
  }

  saveSession (sid, session) {
    // check for arguments
    if (!sid) throw new ReferenceError('sid')
    if (!session) return Promise.resolve()

    // create generator function to save session to redis server
    const gen = function *() {
      // get session key save in redis by session identity
      const sessionKey = this.getSessionKey(sid)

      // get redis client
      const client = this.Client

      // check current session was saved in redis by session key
      const exists = yield client.exists(sessionKey)

      // remove old session from redis server
      if (exists === 1) {
        yield client.del(sessionKey)
      }

      // fetch every key in session
      for (const key of Object.keys(session)) {
        // get saved value for session by key
        const val = this.encode(session[key])

        // save session item to redis
        yield client.hset(sessionKey, key, val)
      }

      // get seconds of expired
      const seconds = this.Expire / 1000

      // set expire for current session
      yield client.expire(sessionKey, seconds)
    }

    // execute generator function
    return co(gen.bind(this))
  }

  release () {
    super.release()

    // release client of redis
    if (this._client) {
      // create generator function to release server
      const gen = function *() {
        try {
          yield aq.then(this._client.disconnect())
        } catch (err) {
          // get instance of logger
          const logger = this.getLogger()

          // append error to logger
          if (logger) {
            logger.error('close redis server failed.', err)
          }
        } finally {
          // set client of redis to null
          this._client = null
        }
      }

      // execute generator function
      co(gen.bind(this))
    }
  }

}

module.exports = SessionComponent
