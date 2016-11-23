// const querystring = require('querystring')
const nblue = require('nblue')
const SuperWare = require('./super')
const JsonMW = require('./../middleware/json')

const aq = nblue.aq
const jsonMW = new JsonMW()

class Scope extends SuperWare
{

  getSchema () {
    return {
      scope: {
        model: {
          name: String,
          path: String,
          methods: String,
          includes: String,
          flag: Boolean
        },
        options: {
          database: 'scope',
          collection: 'scope'
        }
      }
    }
  }

  koa () {
    const that = this

    return function *(next) {
      const ctx = this
      const scope$ = yield that.getContext(ctx, 'scope')
      const settings = scope$.settings || new Map()

      try {
        const req = ctx.request
        const scopeHeader = ctx.get('scope') || null

        if (!scopeHeader) {
          throw new Error('no scope')
        }

        const url = req.url

        if (scope$) {
          const scopes = scopeHeader.split(',')

          scopes.forEach((item) => item)

          // match url
          ctx.set('url', url)
        }

        return yield next
      } catch (err) {
        const jsonErr = settings.has('jsonError')
          ? settings.get('jsonError')
          : false

        if (jsonErr) {
          jsonMW.throw(ctx, err, 500)
        } else ctx.throw(500, err)

        return aq.then(0)
      }
    }
  }

}

module.exports = Scope
