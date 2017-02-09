const core = require('nblue-core')
const ModelApp = require('./app-model')

const aq = core.aq
const co = core.co

const APP_NAME = 'scope'

const CONFIG_KEY_OF_ALLOW_GUEST = 'allowGuest'
const CONFIG_KEY_OF_IGNORE_CASE = 'ignoreCase'
const CONFIG_KEY_OF_DISABLE_HEADER = 'disableHeader'

const DEFAULT_VALUE_OF_ALLOW_GUEST = false
const DEFAULT_VALUE_OF_IGNORE_CASE = true
const DEFAULT_VALUE_OF_DISABLE_HEADER = false

class ScopeApp extends ModelApp
{

  get Database () {
    return APP_NAME
  }

  get ModelName () {
    return APP_NAME
  }

  get ModelSchemas () {
    const database = this.Database
    const collection = this.ModelName

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
          database,
          collection
        }
      }
    }
  }

  get ScopeCache () {
    const modelCache = this.ModelCache
    const cacheKey = '~scope~cache'

    if (!modelCache.has(cacheKey)) {
      modelCache.set(cacheKey, new Map())
    }

    return modelCache.get(cacheKey)
  }

  get AllowGuest () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_ALLOW_GUEST,
      DEFAULT_VALUE_OF_ALLOW_GUEST
    )
  }

  get IngoreCase () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_IGNORE_CASE,
      DEFAULT_VALUE_OF_IGNORE_CASE
    )
  }

  get DisableHeader () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_DISABLE_HEADER,
      DEFAULT_VALUE_OF_DISABLE_HEADER
    )
  }

  koa () {
    const that = this

    return function *(next) {
      // get instance of context
      const ctx = this

      // get instance of request and session
      const req = ctx.request
      const session = ctx.session

      try {
        // get scopes from request header
        let scopeNames = []

        // get scope names from request headers
        if (!that.DisableHeader) {
          scopeNames = (ctx.get('scope') || '').split(',')
        }

        // get socpe names from session
        if (session && session.scopes) {
          if (typeof session.scopes === 'string') {
            scopeNames = session.scopes.split(',')
          } else if (Array.isArray(session.scopes)) {
            scopeNames = session.scopes
          }
        }

        // get all scopes by name
        const scopes = yield that.getScopes(scopeNames)

        // create new object for check options
        const checkOptions = {
          method: req.method,
          path: req.path
        }

        // check scope with options
        if (!that.checkScopes(scopes, checkOptions)) {
          // throw new error if there is no valid scope
          throw new Error('there is no matched scope for the resource')
        }

        return yield next
      } catch (err) {
        // const jsonErr = set$.get('jsonError', false)
        const jsonErr = true

        if (jsonErr) {
          const jsonApp = that.getAppByName('json')

          jsonApp.setError(ctx, err, { status: 500 })
        } else ctx.throw(500, err)

        return aq.then(0)
      }
    }
  }

  getScopes (scopeName) {
    // assign this to that
    const that = this

    // get instance of cache and data application
    const cache = that.ScopeCache
    const dataApp = that.getAppByName('data')

    // assign scope names to names variant
    let names = scopeName

    // append 'guest' scope if it was allowed
    if (that.AllowGuest && names.indexOf('guest') < 0) names.push('guest')

    // remove blank space and empty scope name
    names = names.
      map((name) => name.trim()).
      filter((name) => name !== '')

    // return empty if there is no valid scope name
    if (!names.length === 0) return Promise.resolve([])

    // get scopes that was't cached
    const uncachedScopes = names.filter((scope) => !cache.has(scope))

    return co(function *() {
      // check is there some scopes that wasn't cached
      if (uncachedScopes.length > 0) {
        // define function to get scopes by name from database
        const getScopesByName =
          (val) =>
            (adapter) => function *() {
              yield adapter.
                retrieve({ name: val }).
                each((scope) => cache.set(scope.name, scope))
            }

        // get uncached scopes from database
        yield dataApp.execute('scope', getScopesByName(uncachedScopes))
      }

      // get all scopes with name that saved in cache
      return names.
        filter((name) => cache.has(name)).
        map((name) => cache.get(name))
    })
  }

  checkScopes (scopes, options) {
    // check variants
    if (!scopes || scopes.length === 0) return false

    // assign this to that
    const that = this

    const opts = options || {}
    const reqMethod = opts.method || 'GET'
    const reqPath = opts.path || '/'

    const checkMethod = (item) => {
      // match request methods
      const methods = item.methods ? item.methods.toUpperCase() : ''

      switch (methods) {
      case 'ALL':
      case '*':
        return true
      default:
        return methods.
          split('|').
          some((method) => reqMethod.toUpperCase() === method)
      }
    }

    const checkPath = (item) => {
      // get path from item
      const path = item.path || ''

      // match request path by reg exp
      // golbal symbol, allow for all path
      if (path === '*' || path === '/*') return true
      if (path === '') return false

      const regEx = new RegExp(path, that.IngoreCase ? 'i' : '')

      // match request url by reg exp
      return regEx.test(reqPath)
    }

    return scopes.
      filter((item) => item).
      filter((item) => checkMethod(item)).
      filter((item) => checkPath(item)).
      sort((a, b) => a.priority > b.priority).
      some((item) => item.flag)
  }

}

module.exports = ScopeApp
