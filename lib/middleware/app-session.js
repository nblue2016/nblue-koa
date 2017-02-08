
const nblue = require('nblue-core')
const ModelApp = require('./app-model')
const UUID = nblue.UUID
const co = nblue.co
const APP_NAME = 'session'
// const ONE_DAY = 24 * 60 * 60 * 1000

class SessionApp extends ModelApp
{

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

  koa () {
    const that = this

    return function *(next) {
      const ctx = this

      const sid = that.getSessionId(ctx)

      yield that.bind(ctx, sid)

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

    return sid
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
      let rt = yield dataApp.execute(
        that.ModelName,
        (adapter) => function *() {
          return yield adapter.retrieve({ sid })
        }
      )

      if (rt) {
        if (Array.isArray(rt)) rt = rt.length === 0 ? null : rt[0]
      }

      ctx.session = rt ? that.decode(rt.body) : { id: sid }

      ctx.session = { id: sid }
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
            expire: Date.now() + 1000
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
