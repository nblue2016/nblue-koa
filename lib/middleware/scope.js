// const querystring = require('querystring')
const nblue = require('nblue')
const SuperWare = require('./super')
const JsonMW = require('./../middleware/json')

const aq = nblue.aq
const co = nblue.co
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
          priority: Number,
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
    const scopeCache = new Map()

    const getItemsByScope = function *(ctx, scope) {
      let items = []

      if (scopeCache.has(scope)) {
        // get items by scope name form cache
        scopeCache.
          get(scope).
          forEach((item) => items.push(item))
      } else {
        const conns = ctx.conns

        // get items by scope name from database
        const adapter = yield conns.getAdapter('scope')

        items = yield adapter.retrieve({ name: scope })

        scopeCache.set(scope, items)
      }

      return items
    }

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

          const allowGuest = settings.has('allow-guest')
            ? settings.get('allow-guest')
            : false

          if (allowGuest &&
              scopes.indexOf('guest') < 0) {
            scopes.push('guest')
          }

          const items = yield aq.parallel(
            scopes.
              map((scope) => scope.trim()).
              map((scope) => co(getItemsByScope(scope$, scope)))
          )

          const scopeItems = [].
            concat(... items).
            filter((item) => {
              // match request methods
              const methods = item.methods.toUpperCase()

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
              if (item.path === '*' || item.path === '/*') return true

              const ignoreCase = settings.has('ignore-case')
                ? settings.get('ignore-case')
                : true

              const regEx = new RegExp(item.path, ignoreCase ? 'i' : '')

              // regEx.ignoreCase = ignoreCase
              return regEx.test(req.path)
            }).
            sort((a, b) => a.priority > b.priority).
            map((item) => item.flag)

          if (scopeItems.length === 0) {
            throw new Error(
              'there is no matched scope for the resource'
            )
          } else if (scopeItems[0] === false) {
            throw new Error(
                'the scope was disabled to access the resource.'
              )
          }

          // fetch every scope items
          // scopeItems.forEach(item)

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
