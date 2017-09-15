// reference libraries
const core = require('nblue-core')

// use classes
// const Component = require('./model')
const Component = require('./super')
const aq = core.aq
const co = core.co

// define constants
const COMPONENT_NAME = 'scope'
const CONFIG_KEY_OF_EXPIRE = 'expire'
const CONFIG_KEY_OF_ALLOW_GUEST = 'allowGuest'
const CONFIG_KEY_OF_IGNORE_CASE = 'ignoreCase'
const CONFIG_KEY_OF_DISABLE_HEADER = 'disableHeader'

const DEFAULT_VALUE_EXPIRE = 1000 * 60 * 60 * 2
const DEFAULT_VALUE_OF_ALLOW_GUEST = false
const DEFAULT_VALUE_OF_IGNORE_CASE = true
const DEFAULT_VALUE_OF_DISABLE_HEADER = false

// define an error
const NotMatchedError = new Error('there is no matched scope for the resource')
const DisabledError = new Error('found disable scope in your request')

class ScopeComponent extends Component {

  // define constructor function
  constructor (nblue) {
    // invoke super constructor
    super(nblue, { name: COMPONENT_NAME })
  }

  get Database () {
    return COMPONENT_NAME
  }

  get ModelName () {
    return COMPONENT_NAME
  }

  get Models () {
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

  get Expire () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_EXPIRE,
      DEFAULT_VALUE_EXPIRE
    )
  }

  get AllowGuest () {
    return this.ModelSettings.get(
      CONFIG_KEY_OF_ALLOW_GUEST,
      DEFAULT_VALUE_OF_ALLOW_GUEST
    )
  }

  get IngoreCase () {
    return this.Settings.get(
      CONFIG_KEY_OF_IGNORE_CASE,
      DEFAULT_VALUE_OF_IGNORE_CASE
    )
  }

  get DisableHeader () {
    return this.Settings.get(
      CONFIG_KEY_OF_DISABLE_HEADER,
      DEFAULT_VALUE_OF_DISABLE_HEADER
    )
  }

  _create () {
    // get current component name
    const name = this.Name

    // get instance of component manager
    const cmgr = this.ComponentManager

    // get data component by manager
    const dc = cmgr.getComponentByName('data')

    // define generator function
    const gen = function *() {
      // check data component was created or not
      if (dc) {
        // register connection string for current component
        dc.registerConnectionByConfig(name, this.Config)

        // append scope schemas to data component
        yield dc.appendSchemas(null, { schemas: this.Models })

        this._created = true
      }
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  middleware (ctx, options) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')

    if (!this._created) {
      throw new Error('please create socpe component in the frist!')
    }

    // assign options to opts
    const opts = options || {}

    // get instance of logger
    const logger = this.getLogger()

    // get scopes from request header
    const scopeNames = this.getScopeNames(ctx)

    // create generator function
    const gen = function *() {
      try {
        // check disable options
        if (opts.disable &&
            !this.checkDisables(opts.disable, scopeNames)) {
          // throw error if found disable scope or more
          throw DisabledError
        }

        // check allow options
        if (opts.allow &&
            this.checkAllows(opts.allow, scopeNames)) {
          // exit
          return
        }

        // get all scopes by name from database
        // const scopes = yield this.getScopes(scopeNames)
        const scopes = ['admin']

        // save scopes to current context
        yield aq.then(this.saveScopes(ctx, scopes))

        // check scope with options
        if (!this.checkScopes(ctx, scopes)) {
          // get request from context
          const { request } = ctx

          // append erorr info to logger
          if (logger) {
            logger.warning(
              `fetch failed for ${request.method} to ${request.path}`,
              NotMatchedError
            )
          }

          throw NotMatchedError
        }
      } catch (err) {
        ctx.respond({
          status: 500,
          body: {
            error_code: 500,
            error_message: err.message
          }
        })
        throw err
      }
    }

    // invoke a generator function
    return co(gen.bind(this))
  }

  getScopeNames (ctx) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')

    // assign options to opts
    const { session } = ctx

    // get scope names from request headers
    if (!this.DisableHeader) {
      return (ctx.get('scope') || '').split(',')
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
    // get instance of cache and data application
    const cache = this.ModelCache

    // get instance of data component
    const dt = this.getComponentByName('data')

    const expired = this.Expire

    // assign scope names to names variant
    let names = scopeName

    // append 'guest' scope if it was allowed
    if (this.AllowGuest && names.indexOf('guest') < 0) names.push('guest')

    // remove blank space and empty scope name
    names = names.
      map((name) => name.trim()).
      filter((name) => name !== '')

    // return empty if there is no valid scope name
    if (!names.length === 0) return Promise.resolve([])

    // get scopes that was't cached
    const uncachedScopes = names.
      filter((name) => cache.getItem(name) === null)

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
        rt.forEach((scope) => cache.setItem(scope.name, scope, expired))
      }

      // get all scopes with name that saved in cache
      return names.
        map((name) => cache.getItem(name)).
        filter((item) => item !== null)
    }

    // return result
    return co(gen)
  }

  saveScopes (ctx, scopes) {
    // save scope names to session
    if (ctx.session) {
      ctx.session.scopes = scopes.map((scope) => scope.name)
    }
  }

  checkDisables (val, scopes) {
    const equalFunc = this.getEqualNames.bind(this)

    if (scopes.
      map((name) => name.trim()).
      some((name) => equalFunc(val, name))
    ) return false

    return true
  }

  checkAllows (val, scopes) {
    const equalFunc = this.getEqualNames.bind(this)

    if (scopes.
        map((name) => name.trim()).
        some((name) => equalFunc(val, name))) {
      return true
    }

    return false
  }

  getEqualNames (val, name) {
    return val.
      split(',').
      map((item) => item.trim()).
      some((item) => item === name)
  }

  checkScopes (ctx, scopes) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!scopes || scopes.length === 0) return false

    // assign this to that
    const that = this

    // get request from context
    const { request } = ctx

    // get method and path from request
    const reqMethod = (request.method || 'GET').toUpperCase()
    const reqPath = request.path || '/'

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
