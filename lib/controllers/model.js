// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')

const aq = core.aq
const co = core.co

class ModelController extends Contorler {

  // get middleware by object method name
  getMethod (methodName, options) {
    // assign options to opts
    const opts = options || {}

    switch (methodName.toLowerCase()) {
    // list support methods
    case 'list':
    case 'retrieve':
    case 'get':
    case 'getup':
    case 'getdel':
    case 'getcount':
    case 'create':
    case 'query':
    case 'search':
    case 'aggregate':
    case 'count':
    case 'update':
    case 'upsert':
    case 'getquery':
    case 'delete': {
      // get function of execute by name
      // const execFunc = this.getMethodByName('exec').bind(this)
      const execFunc = this.exec.bind(this)

      // throw error if can't find target method
      if (!execFunc) throw new Error(`can't find exec function`)

      // set new method name as method name
      let newMethodName = methodName

      // convert some special name
      if (methodName === 'get') newMethodName = 'getf'

      // get instanc of method by name and bind this
      const method = this[newMethodName].bind(this)

      // invoke exec function by method name with options
      return execFunc(method, opts)
    }
    default:
      // invoke super function
      return super.getMethod(methodName, opts)
    }
  }

  // define method of model, show model schema by name
  model (ctx, options) {
    // assign options to opts
    const opts = options || {}

    // get instance of data application
    const dt = this.getComponentByName('data')

    // get schema by model name
    const schema = dt.Schemas.Schema(opts.model)

    // get model from schema
    const body = schema ? schema.model : {}

    // output model to response
    return ctx.respond({ body })
  }

  exec (method, options) {
    // declare varints of instance
    const opts = options || {}

    // check item in opts
    if (!opts.model) throw new Error('can\'t find model.')

    // bind this to method function
    const methodFunc = method.bind(this)

    // get instance of logger
    const logger = this.getLogger()

    // get instance of data component
    const dc = this.getComponentByName('data')

    // return a promise function with context
    return function (ctx) {
      // define a function to execute command by adapter
      const invokeFunc = (adapter) => methodFunc(ctx, adapter)

      // invoke database operation
      return co(function *() {
        try {
          // get result by data adpater
          const rt = yield dc.pexecute(opts.model, invokeFunc)

          // output result to response
          ctx.respond({ body: rt })
        } catch (err) {
          // append error to logger
          if (logger) logger.error(err.message, err)

          // output error to response
          ctx.respond({ body: err })
        }
      })
    }
  }

  // define method of getting all objects
  list (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // invoke target function
    return adapter.retrieve({})
  }

  // define method of getting objects with one conditon by request path
  retrieve (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from context
    const params = this._getParams(ctx)

    // co genreator function to return a Promise
    return co(function *() {
      const filter = {}

      if (!params.key) throw new Error('can\'t find key')

      filter[params.key] = params.val

      return yield adapter.retrieve(filter)
    })
  }

  // define method of getting an object with identity
  getf (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from context
    const params = this._getParams(ctx)

    // check for arguments
    if (!params.id) throw new ReferenceError('id')

    // co genreator function to return a Promise
    return co(function *() {
      // try to get target by identity
      const rt = yield adapter.get(params.id)

      if (rt === null) {
        throw new Error(`can't find object by id: ${params.id}`)
      }

      return rt
    })
  }

  // define method of getting an object with identity and updating
  getup (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from context
    const params = this._getParams(ctx)

    // get body from context
    const body = this._getBody(ctx)

    // get identity from parameters
    const id = params.id

    // check for arguments
    if (!params.id) throw new ReferenceError('id')

    return co(function *() {
      // get model data by identity
      const item = yield adapter.get(id)

      // throw error if can't find it by identity
      if (!item) throw new Error(`can't find item by key ${id}`)

      // modify property for current item
      Object.
        keys(body).
        forEach((key) => {
          item[key] = body[key]
        })

      // save changes
      return item.save()
    })
  }

  // define method of getting an object with identity and deleting
  getdel (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from context
    const params = this._getParams(ctx)

    // get identity from parameters
    const id = params.id

    return co(function *() {
      // get model data by identity
      const item = yield adapter.get(id)

      // throw error if can't find it by identity
      if (!item) throw new Error(`can't find item by key ${id}`)

      // remove item self from database
      yield item.remove()

      // return result
      return aq.then({ ok: 1, n: 1 })
    })
  }

  // define method of creating new object with body
  create (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // throw error if body is null
    if (!body) throw new Error(`can't find body from request`)

    // invoke target function
    return adapter.create(body)
  }

  // define method of update object with filter,
  // it will create a new one if matched object wasn't found
  upsert (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // throw error if body is null
    if (!body) throw new Error(`can't find body from request`)

    // define function to update item
    const updateFunc = this.update.bind(this)

    // try to get method from adapter
    const methodFunc = adapter.upsert

    if (methodFunc &&
        typeof methodFunc === 'function') {
      return methodFunc(body)
    }

    // invoke a genreator function to a Promise
    return co(function *() {
      // call update function by request
      const rt = yield updateFunc(ctx, adapter)

      // find matched items, return result
      if (rt.nModified > 0) return rt

      // try to create new one if there is no matche item
      let modifier = null

      // get modifier from body
      if (body && body.modifier) modifier = body.modifier
      if (body && body.$modifier) modifier = body.$modifier

      // invoke create functoin to create new one
      yield adapter.create(modifier)

      // return result
      return {
        ok: 1,
        nModified: 1,
        n: 1
      }
    })
  }

  // define method of searching objects with filter for koa
  query (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // parse filter and options from request body
    const filter = this._parseFilter(body)
    const opts = this._parseOptions(body)

    // throw error if filter is empty
    // please use list command to retrieve all items
    if (!filter) throw new Error(`can't find filter in context`)

    // invoke target function
    return adapter.retrieve(filter, opts)
  }

  // define method of searching objects with filter call by get method
  getquery (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // get query from request
    const query = req.query

    // declare filter and options
    const filter = {}

    let opts = {}

    // parse filter and options from body
    Object.
      keys(query).
      forEach((key) => {
        if (key.startsWith('$')) opts[key] = query[key]
        else filter[key] = query[key]
      })

    // reset values in options
    Object.
      keys(opts).forEach((key) => {
        const val = opts[key]

        if (Number.parseInt(val, 10)) {
          opts[key] = Number.parseInt(val, 10)
        } else if (Number.parseFloat(val)) {
          opts[key] = Number.parseFloat(val)
        }
      })

    // re-parse items in optiosn
    opts = this._parseOptions(opts)

    // invoke target function
    return adapter.retrieve(filter, opts)
  }

  // define method of aggregate objects with filter
  aggregate (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // parse filter and options from body
    const filter = this._parseFilter(body)
    const opts = this._parseOptions(body)

    // invoke target function
    return adapter.aggregate(filter, opts)
  }

  // define method of counting objects with filter
  count (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // parse filter from request body
    const filter = this._parseFilter(body)

    // apply target function to get result
    return adapter.count(filter)
  }

  // define method of counting objects with filter
  getcount (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // get query from request
    const query = req.query

    // declare filter and options
    const filter = {}

    // get filter and options from request query
    Object.
      keys(query).
      forEach((key) => {
        filter[key] = query[key]
      })

    // invoke target function
    return adapter.count(filter)
  }

  // define method of updataing objects with filter and modifier
  update (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // declare
    let
      filter = null,
      modifier = null

    // parse filter and modifier from body
    if (body && body.filter) filter = body.filter
    if (body && body.$filter) filter = body.$filter

    if (body && body.modifier) modifier = body.modifier
    if (body && body.$modifier) modifier = body.$modifier

    // both of filter and modifier need exist
    if (!filter) throw new Error(`can't find filter in context`)
    if (!modifier) throw new Error(`can't find modifier in context`)

    // apply target function to get result
    return adapter.update(filter, modifier)
  }

  // define method of deleting objects with filter
  delete (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from context
    const body = this._getBody(ctx)

    // declare filter
    let filter = null

    // parse filter from body
    if (body && body.filter) filter = body.filter
    if (body && body.$filter) filter = body.$filter
    if (!filter) filter = body

    // throw error if can't find filter
    if (!filter) throw new Error(`can't find filter in context`)

    // disable to apply delete action with empty filter
    // it's dangous to clear all data
    if (Object.keys(filter).length === 0) {
      throw new Error(`doesn't support delete all items`)
    }

    // return resulta
    return adapter.delete(filter)
  }

  // get params from context or request
  _getParams (ctx) {
    // get instance of request from context
    const req = ctx.request

    // return params from context or request
    return ctx.params ? ctx.params : req.params
  }

  // get params from context or request
  _getBody (ctx) {
    // get instance of request from context
    const req = ctx.request

    // return params from context or request
    return ctx.body ? ctx.body : req.body
  }

  // parse filter conditions by request body
  _parseFilter (reqBody) {
    const that = this
    const body =
      reqBody && typeof reqBody === 'string'
      ? JSON.parse(reqBody)
      : reqBody || {}

    const use$ = that.getSetting('use$')

    // parse query in body
    if (use$ === true) {
      if (body.$query) return body.$query
      if (body.$filter) return body.$filter
    } else {
      if (body.query) return body.query
      if (body.filter) return body.filter
    }

    return body
  }

  // parse filter options by request body
  _parseOptions (reqBody) {
    const that = this
    const body =
      reqBody && typeof reqBody === 'string'
      ? JSON.parse(reqBody)
      : reqBody || {}

    // create new object for options
    const opts = {}
    const use$ = that.getSetting('use$')

    // parse fields and sort and pager
    if (use$ === true) {
      if (body.$fields) opts.fields = body.$fields
      if (body.$limit) opts.limit = body.$limit
      if (body.$skip) opts.skip = body.$skip
      if (body.$sort) opts.sort = body.$sort
      if (body.$page) opts.page = body.$page
      if (body.$pageSize) opts.pageSize = body.$pageSize
    } else {
      if (body.fields) opts.fields = body.fields
      if (body.limit) opts.limit = body.limit
      if (body.skip) opts.skip = body.skip
      if (body.sort) opts.sort = body.sort
      if (body.page) opts.page = body.page
      if (body.pageSize) opts.pageSize = body.pageSize
    }

    // convert type
    const numItems = ['limit', 'skip', 'page', 'pageSize']

    numItems.
      filter((key) => key).
      forEach((key) => {
        opts[key] = Number.parseInt(opts[key], 10)
      })

    // return options
    return opts
  }

}

module.exports = ModelController
