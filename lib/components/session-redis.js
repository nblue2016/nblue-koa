// reference libraries
const core = require('nblue-core')
const aq = core.aq
const co = core.co

// const Constants = require('.././constants')
const Component = require('./session')

class SessionComponent extends Component {

  constructor (nblue) {
    super(nblue)

    this._cache = null
    this._client = null
  }

  get Client () {
    return this._client
  }

  getPackages () {
    return ['ioredis']
  }

  modelCreate () {
    // get connection string for redis server
    const cs = this.getConnectoinString()

    // check connection string
    if (!cs) {
      throw new Error("can't find connection string for redis server.")
    }

    // use class
    const Redis = require('ioredis')

    // create new instance of redis client
    this._client = new Redis(cs)
  }

  getSessionKey (sid) {
    return `session:sid:${sid}`
  }

  getSession (sid) {
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
        const keys = yield client.hkeys(sessionKey)

        // if found keys, assign values
        if (keys.length > 0) {
          // fetch every key
          for (const key of keys) {
            // get value of session item by key
            const val = yield client.hget(sessionKey, key)

            // assign item to session
            session[key] = this.decode(val)
          }
        }
      }

      // return instance of session
      return session
    }.bind(this)

    // execute function
    return co(gen)
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

    // execute function
    return co(gen.bind(this))
  }

  release () {
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
      }.bind(this)

      // execute function
      co(gen)
    }
  }

}

module.exports = SessionComponent
