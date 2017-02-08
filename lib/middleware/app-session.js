const nblue = require('nblue-core')
const ModelApp = require('./app-model')
const UUID = nblue.UUID
const co = nblue.co
const APP_NAME = 'session'
const DEFAULT_EXPIRE = 1000
const KEY_OF_EXPIRE = 'expire'
// const ONE_DAY = 24 * 60 * 60 * 1000

class SessionApp extends ModelApp
{

  constructor (nkoa) {
    super(nkoa)

    this._expire = DEFAULT_EXPIRE
  }

  get ModelName () {
    return APP_NAME
  }

  get ModelSchemas () {
    const name = this.ModelName

    return {
      session: {
        model: {
          sid: String,
          body: String,
          expire: Date
        },
        options: {
          database: name,
          collection: name
        }
      }
    }
  }

  get Expire () {
    return this._expire
  }

  modelCreate () {
    const settings = this.ModelSettings

    if (settings.has(KEY_OF_EXPIRE)) {
      this._expire = settings.get(KEY_OF_EXPIRE)
    }
  }

  koa () {
    const that = this

    return function *(next) {
      const ctx = this

      let sid = yield that.getSessionId(ctx)

      sid = yield that.bind(ctx, sid)

      yield next

      yield that.save(ctx, sid)
    }
  }

  getSessionId (ctx) {
    const that = this
    const cookies = ctx.cookies

    let sid = null

    // try to get session identity from cookies
    if (cookies) {
      sid = cookies.get('sid')
    }

    // try to get session identity from request
    if (!sid) {
      const req = ctx.request

      if (req.query && req.query.sid) {
        sid = req.query.sid
      }
    }

    if (!sid) {
      sid = that.generateSessionId()
    }

    return Promise.resolve(sid)
  }

  generateSessionId () {
    return UUID.generate('v4')
  }

  isValidSessionId () {
    return Promise.resolve(true)
  }

  bind (ctx, sid) {
    const that = this
    const nkoa = that.Nkoa
    const amgr = nkoa.ApplicationManager
    const dataApp = amgr.getApplication('data')

    return function *() {
      let
        nsid = sid,
        rt = null

      yield dataApp.execute(
        that.ModelName,
        (adapter) => co(function *() {
          rt = yield adapter.retrieve({ sid: nsid })

          if (rt) {
            if (Array.isArray(rt)) rt = rt.length === 0 ? null : rt[0]
          }

          if (rt && rt.expire && Date.now() > rt.expire) {
            // delete session data in database
            yield adapter.delete({ sid: nsid })

            // clear expired session
            rt = null
            nsid = that.generateSessionId()
          }
        })
      )

      ctx.session = rt ? that.decode(rt.body) : { id: nsid }

      return nsid
    }
  }

  save (ctx, sid) {
    const that = this
    const nkoa = that.Nkoa
    const amgr = nkoa.ApplicationManager
    const dataApp = amgr.getApplication('data')
    const cookies = ctx.cookies
    const session = ctx.session

    return function *() {
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

      if (cookies) {
        cookies.set('sid', session ? sid : null)
      }
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
