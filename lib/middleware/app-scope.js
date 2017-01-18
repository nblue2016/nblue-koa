const nblue = require('nblue-core')
const ModelApp = require('./app-model')

const aq = nblue.aq

class ScopeApp extends ModelApp
{

  get AppName () {
    return 'scope'
  }

  get AppSchemas () {
    const name = this.AppName

    return {
      scope: {
        model: {
          name: String,
          path: String,
          methods: String,
          includes: String,
          priority: Number,
          flag: Boolean
        },
        options: {
          database: name,
          collection: name
        }
      }
    }
  }

  get ScopeCache () {
    const box = this.AppBox
    const cacheKey = '~scope~cache'

    if (!box.has(cacheKey)) {
      box.set(cacheKey, new Map())
    }

    return box.get(cacheKey)
  }

  koa () {
    const that = this

    return function *(next) {
      const ctx = this

      yield that.init(ctx)

      yield that.check(ctx, next)
    }
  }

  check (ctx, next) {
    const that = this
    const nkoa = that.Nkoa
    const appSettings = that.AppSettings

    const amgr = nkoa.ApplicationManager
    const jsonApp = amgr.getApplication('json')
    const dataApp = amgr.getApplication('data')

    return function *() {
      try {
        const req = ctx.request
        const cache = that.ScopeCache
        const allowGuest = appSettings.get('allowGuest', false)

        // get scopes from request header
        let scopes = (ctx.get('scope') || '').split(',')

        if (ctx.session) ctx.session.scopes = scopes

        // append 'guest' scope if it was allowed
        if (allowGuest && scopes.indexOf('guest') < 0) scopes.push('guest')

        // remove empty scope
        scopes = scopes.
          map((scope) => scope.trim()).
          filter((scope) => scope !== '')

        // throw excpetion if can't find scope defintion in headers
        if (!scopes.length === 0) throw new Error('no scope')

        // get scopes that was't cached
        const uncachedScopes = scopes.filter((scope) => !cache.has(scope))

        if (uncachedScopes.length > 0) {
          // get checking scopes from database
          yield dataApp.execute(
            ctx,
            'scope',
            (adapter) => function *() {
              yield adapter.
                retrieve({ name: uncachedScopes }).
                each((item) => cache.set(item.name, item))
            }
          )
        }

        const items = scopes.
          map((scope) => cache.get(scope)).
          filter((item) => {
            // match request methods
            const methods = item.methods ? item.methods.toUpperCase() : ''

            switch (methods) {
            case 'ALL':
            case '*':
              return true
            default:
              return methods.
                split('|').
                some((method) => req.method.toUpperCase() === method)
            }
          }).
          filter((item) => {
            // get path from item
            const path = item.path || ''

            // match request path by reg exp
            // golbal symbol, allow for all path
            if (path === '*' || path === '/*') return true
            if (path === '') return false

            const ignoreCase = appSettings.get('ignore-case', true)
            const regEx = new RegExp(path, ignoreCase ? 'i' : '')

            // match request url by reg exp
            return regEx.test(req.path)
          }).
          sort((a, b) => a.priority > b.priority).
          map((item) => item.flag)

        if (items.length === 0) {
          throw new Error('there is no matched scope for the resource')
        } else if (items[0] === false) {
          throw new Error('the scope was disabled to access the resource.')
        }

        return yield next
      } catch (err) {
        // const jsonErr = set$.get('jsonError', false)
        const jsonErr = true

        if (jsonErr) {
          jsonApp.setError(ctx, err, { status: 500 })
        } else ctx.throw(500, err)

        return aq.then(0)
      }
    }
  }

}

module.exports = ScopeApp
