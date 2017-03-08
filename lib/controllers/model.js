// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')

const aq = core.aq
const co = core.co

class ModelController extends Contorler {

  // get middleware by object method name
  getMethod (method, options) {
    // assign options to opts
    const opts = options || {}

    switch (method.toLowerCase()) {
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
      const execFunc = this.getMethodByName('exec')

      // throw error if can't find target method
      if (!execFunc) throw new Error(`can't find exec function`)

      // invoke exec function by method name with options
      return execFunc(this.getMethodByName(method), opts)
    }
    default:
      // invoke super function
      return super.getMethod(method, opts)
    }
  }

  // define method of model, show model schema by name
  model (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of data application
    const dt = this.getComponentByName('data')

    // get instance of schemas from data application
    const schemas = dt.Schemas

    // get schema by model name
    const schema = schemas.Schema(opts.model)

    // output model to response
    return this.generateResponse(schema ? schema.model : {})
  }

  // get data adapter by object name
  kexec (methodFunc, options) {
    // declare varints of instance
    const that = this
    const opts = options || {}

    // get instance of data component
    const dc = this.getComponentByName('data')

    return function *() {
      // assign this to context
      const ctx = this

      // get instance of logger
      const logger = that.getLogger()

      try {
        // check model name
        if (!opts.model) throw new Error('can\'t find model.')

        // define a function to execute command by adapter
        const invokeFunc = (adapter) => methodFunc(ctx, adapter)

        // get result from execute adapter
        const rt = yield dc.pexecute(opts.model, invokeFunc)

        // output body to response
        that.outputToResponse(rt, { ctx })
      } catch (err) {
        // append error to logger
        if (logger) logger.error(err.message, err)

        // throw error
        that.outputToResponse(err, { ctx })
      }
    }
  }

  // get data adapter by object name
  eexec (methodFunc, options) {
    // declare varints of instance
    const opts = options || {}

    // get instance of data component
    const dc = this.getComponentByName('data')

    // get instance of logger
    const logger = this.getLogger()

    // define function for respond result
    const respond = this.outputToResponse.bind(this)

    return function (req, res) {
      return co(function *() {
        try {
          // check model name
          if (!opts.model) throw new Error('can\'t find model.')

          // define a function to execute command by adapter
          const invokeFunc = (adapter) => methodFunc(req, adapter)

          // get result from execute adapter
          const rt = yield dc.pexecute(opts.model, invokeFunc)

          // output body to response
          respond(rt, { req, res })
        } catch (err) {
          // append error to logger
          if (logger) logger.error(err.message, err)

          // throw error
          respond(err, { req, res })
        }
      })
    }
  }

  // define method of getting all objects for koa
  klist (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // invoke target function
    return adapter.retrieve({})
  }

  // define method of getting all objects for express
  elist (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // invoke target function
    return adapter.retrieve({})
  }

  // define method of getting objects with one conditon
  // by request path for koa
  kretrieve (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // invoke target function
    return this.retrieve(ctx.params, adapter)
  }

  // define method of getting objects with one conditon
  // by request path for express
  eretrieve (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // invoke target function
    return this.retrieve(req.params, adapter)
  }

  retrieve (params, adapter) {
    // check for arguments
    if (!adapter) throw new ReferenceError('adapter')

    // co genreator function to return a Promise
    return co(function *() {
      const filter = {}

      if (!params.key) throw new Error('can\'t find key')

      filter[params.key] = params.val

      return yield adapter.retrieve(filter)
    })
  }

  // define method of getting an object
  // with identity for koa
  kget (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from context
    const params = ctx.params

    // invoke target function
    return this.eget(params.id, adapter)
  }

  // define method of getting an object
  // with identity for express
  eget (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get params from request
    const params = req.params

    // invoke target function
    return this.getf(params.id, adapter)
  }

  getf (id, adapter) {
    // check for arguments
    if (!id) throw new ReferenceError('id')

    // co genreator function to return a Promise
    return co(function *() {
      // try to get target by identity
      const rt = yield adapter.get(id)

      if (rt === null) {
        throw new Error(`can't find object by id: ${id}`)
      }

      return rt
    })
  }

  // define method of getting an object
  // with identity and updating for koa
  kgetup (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get parameters and request from context
    const params = ctx.params
    const req = ctx.request

    // invoke target function
    return this.getup(params.id, req.body, adapter)
  }

  // define method of getting an object
  // with identity and updating for express
  egetup (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get parameters from request
    const params = req.params

    // invoke target function
    return this.getup(params.id, req.body, adapter)
  }

  // define method of getting an object
  // with identity and updating
  getup (id, body, adapter) {
    // check for arguments
    if (!id) throw new ReferenceError('id')
    if (!adapter) throw new ReferenceError('adapter')

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

  // define method of getting an object
  // with identity and deleting for koa
  kgetdel (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get parameters from context
    const params = ctx.params

    // invoke target function
    return this.getdel(params.id, adapter)
  }

  // define method of getting an object
  // with identity and deleting for express
  egetdel (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get parameters from request
    const params = req.params

    // invoke target function
    return this.getdel(params.id, adapter)
  }

  // define method of getting an object
  // with identity and deleting
  getdel (id, adapter) {
    // check for arguments
    if (!id) throw new ReferenceError('id')
    if (!adapter) throw new ReferenceError('adapter')

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

  // define method of creating new object with body for koa
  kcreate (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke target function
    return this.ecreate(req, adapter)
  }

  // define method of creating new object with body for express
  ecreate (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

    // throw error if body is null
    if (!body) throw new Error(`can't find body from request`)

    // invoke target function
    return adapter.create(body)
  }

  // define method of update object with filter,
  // it will create a new one if matched object wasn't found for koa
  kupsert (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke target function
    return this.eupsert(req, adapter)
  }

  // define method of update object with filter,
  // it will create a new one if matched object wasn't found for express
  eupsert (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

    // check method
    if (!body) throw new Error(`can't find body in context`)

    // define function to update item
    const updateFunc = this.eupdate.bind(this)

    // try to get method from adapter
    const methodFunc = adapter.upsert

    if (methodFunc &&
        typeof methodFunc === 'function') {
      return methodFunc(body)
    }

    // invoke a genreator function to a Promise
    return co(function *() {
      // call update function by request
      const rt = yield updateFunc(req, adapter)

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
  kquery (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    return this.equery(req, adapter)
  }

  // define method of searching objects with filter for koa
  equery (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

    // parse filter and options from request body
    const filter = this.parseFilter(body)
    const opts = this.parseOptions(body)

    // throw error if filter is empty
    // please use list command to retrieve all items
    if (!filter) throw new Error(`can't find filter in context`)

    // invoke target function
    return adapter.retrieve(filter, opts)
  }

  // define method of searching objects
  // with filter call by get method for koa
  kgetquery (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke target function
    return this.egetquery(req, adapter)
  }

  // define method of searching objects
  // with filter call by get method for express
  egetquery (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

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
    opts = this.parseOptions(opts)

    // invoke target function
    return adapter.retrieve(filter, opts)
  }

  // define method of aggregate objects with filter for koa
  kaggregate (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke target function
    return this.eaggregate(req, adapter)
  }

  // define method of aggregate objects with filter for express
  eaggregate (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

    // parse filter and options from body
    const filter = this.parseFilter(body)
    const opts = this.parseOptions(body)

    // invoke target function
    return adapter.aggregate(filter, opts)
  }

  // define method of counting objects with filter for koa
  kcount (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke target function
    return this.ecount(req.body, adapter)
  }

  // define method of counting objects with filter for express
  ecount (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // parse filter from request body
    const filter = this.parseFilter(req.body)

    // apply target function to get result
    return adapter.count(filter)
  }

  // define method of counting objects with filter
  // call by get method for koa
  kgetcount (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // apply target function to get result
    return this.egetcount(req, adapter)
  }

  // define method of counting objects with filter
  // call by get method for express
  egetcount (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get query from request
    const query = req.query

    // declare filter and options
    const filter = {}
    let opts = {}

    // get filter and options from request query
    Object.
      keys(query).
      forEach((key) => {
        if (key.startsWith('$')) opts[key] = query[key]
        else filter[key] = query[key]
      })

    // convert value in options
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
    opts = this.parseOptions(opts)

    // invoke target function
    return adapter.count(filter, opts)
  }

  // define method of updataing objects
  // with filter and modifier for koa
  kupdate (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // apply target function to get result
    return this.eupdate(req, adapter)
  }

  // define method of updataing objects
  // with filter and modifier for express
  eupdate (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('req')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

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

  // define method of deleting objects
  // with filter for koa
  kdelete (ctx, adapter) {
    // check for arguments
    if (!ctx) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get request from context
    const req = ctx.request

    // invoke delete methoe
    return this.edelete(req, adapter)
  }

  // define method of deleting objects
  // with filter for express
  edelete (req, adapter) {
    // check for arguments
    if (!req) throw new ReferenceError('ctx')
    if (!adapter) throw new ReferenceError('adapter')

    // get body from request
    const body = req.body

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

  // parse filter conditions by request body
  parseFilter (reqBody) {
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
  parseOptions (reqBody) {
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
