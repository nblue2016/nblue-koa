// reference libraries
const core = require('nblue-core')

// use class
const Component = require('./model')
const aq = core.aq
const co = core.co

// define constants
const APP_NAME = 'scope'

const CONFIG_KEY_OF_ALLOW_GUEST = 'allowGuest'
const CONFIG_KEY_OF_IGNORE_CASE = 'ignoreCase'
const CONFIG_KEY_OF_DISABLE_HEADER = 'disableHeader'

const DEFAULT_VALUE_OF_ALLOW_GUEST = false
const DEFAULT_VALUE_OF_IGNORE_CASE = true
const DEFAULT_VALUE_OF_DISABLE_HEADER = false

// define an error
const NotMatchedError = new Error('there is no matched scope for the resource')

class ScopeComponent extends Component {

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
          collection,
          hidden: true
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
    // check current component was created or not
    if (!this.check()) return null

    // define function for repond
    const respond = this.respond.bind(this)

    // define function to get middle ware
    const gen = this.processScope.bind(this)

    // return middleware
    return function *(next) {
      // get instance of context
      const ctx = this

      // generate options for middleware
      const opts = {
        req: ctx.request,
        session: ctx.session
      }

      try {
        // invoke target function
        yield co(gen(opts))

        // invoke next middleware
        yield next
      } catch (err) {
        respond({ ctx, error: err })
      }
    }
  }

  koa2 () {
    // check current component was created or not
    if (!this.check()) return null

    // define function for repond
    const respond = this.respond.bind(this)

    // define function to get middle ware
    const gen = this.processScope.bind(this)

    // return middleware
    return function (ctx, next) {
      // generate options for middleware
      const opts = {
        req: ctx.request,
        session: ctx.session
      }

      // invoke target function
      return co(gen(opts)).
        then(() => next()).
        catch((err) => respond({ ctx, error: err }))
    }
  }

  express () {
    // check current component was created or not
    if (!this.check()) return null

    // define function for repond
    const respond = this.respond.bind(this)

    // define function to get middle ware
    const gen = this.processScope.bind(this)

    // return middleware
    return function (req, res, next) {
      // generate options for middleware
      const opts = { req, session: req.session }

      // invoke target function
      return co(gen(opts)).
        then(() => next()).
        catch((err) => respond({ req, res, error: err }))
    }
  }

  *processScope (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of logger
    const logger = this.getLogger()

    // get request from options
    const req = opts.req

    // check request
    if (!req) throw new ReferenceError('req')

    // get scopes from request header
    const scopeNames = this.getScopeNames(opts)

    // get all scopes by name
    const scopes = yield this.getScopes(scopeNames)

    // create new object for check options
    const checkOptions = {
      method: req.method,
      path: req.path
    }

    yield aq.then(this.saveScopes(scopes, opts))

    // check scope with options
    if (!this.checkScopes(scopes, checkOptions)) {
      // append erorr info to logger
      if (logger) {
        logger.warning(
          `fetch failed for ${req.method.toUpperCase()} to ${req.path}`,
          NotMatchedError
        )
      }

      throw NotMatchedError
    }
  }

  getScopeNames (options) {
    // assign options to opts
    const { req, session } = options || {}

    // get scope names from request headers
    if (!this.DisableHeader) {
      return (req.get('scope') || '').split(',')
    }

    // get socpe names from session
    if (session && session.scopes) {
      if (typeof session.scopes === 'string') {
        return session.scopes.split(',')
      } else if (Array.isArray(session.scopes)) {
        return session.scopes
      }
    }

    // return empty array
    return []
  }

  getScopes (scopeName) {
    // assign this to that
    const that = this

    // get instance of cache and data application
    const cache = that.ScopeCache
    const dt = that.getComponentByName('data')

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

    // create generator function to get uncached scopes
    const gen = function *() {
      // check is there some scopes that wasn't cached
      if (uncachedScopes.length > 0) {
        // get uncached scopes from database
        const rt = yield dt.pexecute(
                      'scope',
                      (adapter) => adapter.retrieve({ name: uncachedScopes })
                    )

        // fetch scopes and save to cache
        rt.forEach((scope) => cache.set(scope.name, scope))
      }

      // get all scopes with name that saved in cache
      return names.
        filter((name) => cache.has(name)).
        map((name) => cache.get(name))
    }

    // return result
    return co(gen)
  }

  saveScopes (scopes, options) {
    // assign options to opts
    const opts = options || {}

    // save scope names to session
    if (opts.session) {
      opts.session.scopes = scopes.map((scope) => scope.name)
    }
  }

  checkScopes (scopes, options) {
    // check variants
    if (!scopes || scopes.length === 0) return false

    // assign this to that
    const that = this

    const opts = options || {}
    const reqMethod = (opts.method || 'GET').toUpperCase()
    const reqPath = opts.path || '/'

    // define the function to check request HTTP METHOD
    const checkMethod = (item) => {
      // get property of request methods from item
      const methods = (item.methods ? item.methods : '').toUpperCase()

      switch (methods) {
      case 'ALL':
      case '*':
        // always return true if the symbol that match all method
        return true
      default:
        // split methods by '|' and find matched item includes request method
        return methods.
          split('|').
          map((method) => method.trim()).
          some((method) => reqMethod === method)
      }
    }

    // define the function to check request path
    const checkPath = (item) => {
      // get property of path from item
      const path = item.path || ''

      // match request path by reg exp
      // golbal symbol, allow for all path
      if (path === '*' || path === '/*') return true
      if (path === '') return false

      // create regular expression for request path
      const regEx = new RegExp(path, that.IngoreCase ? 'i' : '')

      // match request path by regular expression
      return regEx.test(reqPath)
    }

    // return valid scopes for current context
    return scopes.
      filter((item) => item).
      filter((item) => checkMethod(item)).
      filter((item) => checkPath(item)).
      sort((a, b) => a.priority > b.priority).
      some((item) => item.flag)
  }

}

module.exports = ScopeComponent
