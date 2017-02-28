// reference libraries
const core = require('nblue-core')

// use class
const Contorler = require('./super.js')

const aq = core.aq
const co = core.co
const StringBuilder = core.StringBuilder

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
    const dataApp = this.getAppByName('data')

    // get instance of schemas from data application
    const schemas = dataApp.Schemas

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
    const dataApp = this.getAppByName('data')

    return function *() {
      // declare variants of koa middleware
      const ctx = this
      const logger = that.getLogger()

      try {
        if (!opts.model) throw new Error('can\'t find model.')

        // execute caller to get result
        yield dataApp.execute(
          opts.model,
          (adapter) => co(function *() {
            // define caller function for data adapter
            // get result of apply method
            const rt = yield methodFunc(ctx, adapter)

            // set response body
            that.outputToResponse(rt, { ctx })
          })
        )
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply ${opts.model}/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, err)

        err.message = message

        // throw error
        that.outputToResponse(err, { ctx })
      }
    }
  }

  // define method of getting all objects
  klist (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      return yield adapter.retrieve({})
    })
  }

  // define method of getting objects with one conditon by request path
  kretrieve (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const filter = {}
      const params = ctx.params

      if (!params.key) throw new Error('can\'t find key')

      filter[params.key] = params.val

      return yield adapter.retrieve(filter)
    })
  }

  // define method of getting an object with identity
  kget (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const params = ctx.params

      const rt = yield adapter.get(params.id)

      if (rt === null) {
        throw new Error(`can't find object by id:${params.id}`)
      }

      return rt
    })
  }

  // define method of getting an object with identity and updating
  kgetup (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const params = ctx.params
      const req = ctx.request
      const item = yield adapter.get(params.id)

      if (!item) throw new Error(`can't find item by key ${params.id}`)

      const body = req.body

      Object.
        keys(body).
        forEach((key) => {
          item[key] = body[key]
        })

      return item.save()
    })
  }

  // define method of getting an object with identity and deletng
  kgetdel (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const params = ctx.params
      const item = yield that.kget(ctx, adapter)

      if (!item) {
        throw new Error(`can't find item by key ${params.id}`)
      }

      yield item.remove()

      return aq.then({
        ok: 1,
        n: 1
      })
    })
  }

  // define method of creating new object with body
  kcreate (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request
      const body = req.body

      if (!body) throw new Error(`can't find body in context`)

      return yield adapter.create(body)
    })
  }

  // define method of update object with filter,
  // it will create a new one if matched object wasn't found
  kupsert (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    const that = this

    return co(function *() {
      const req = ctx.request
      const body = req.body

      if (!body) throw new Error(`can't find body in context`)

      const methodFunc = adapter.upsert

      if (methodFunc &&
          typeof methodFunc === 'function') {
        return yield methodFunc(body)
      }

      const rt = yield that.kupdate(ctx, adapter)

      if (rt.nModified === 0) {
        let modifier = null

        if (body && body.modifier) modifier = body.modifier
        if (body && body.$modifier) modifier = body.$modifier

        yield adapter.create(modifier)

        return {
          ok: 1,
          nModified: 1,
          n: 1
        }
      }

      return rt
    })
  }

  // define method of searching objects with filter
  kquery (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      if (!filter) throw new Error(`can't find filter in context`)

      return yield adapter.retrieve(filter, opts)
    })
  }

  // define method of searching objects with filter call by get method
  kgetquery (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    const req = ctx.request
    const query = req.query
    const filter = {}
    const opts = {}

    Object.
      keys(query).
      forEach((key) => {
        if (key.startsWith('$')) opts[key] = query[key]
        else filter[key] = query[key]
      })

    Object.
      keys(opts).forEach((key) => {
        const val = opts[key]

        if (Number.parseInt(val, 10)) {
          opts[key] = Number.parseInt(val, 10)
        } else if (Number.parseFloat(val)) {
          opts[key] = Number.parseFloat(val)
        }
      })

    return adapter.retrieve(filter, that.parseOptions(opts))
  }

  // define method of counting objects with filter
  kaggregate (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      return yield adapter.aggregate(filter, opts)
    })
  }

  // define method of counting objects with filter
  kcount (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)

      return yield adapter.count(filter)
    })
  }

  // define method of counting objects with filter call by get method
  kgetcount (ctx, adapter) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    const req = ctx.request
    const query = req.query
    const filter = {}
    const opts = {}

    Object.
      keys(query).
      forEach((key) => {
        if (key.startsWith('$')) opts[key] = query[key]
        else filter[key] = query[key]
      })

    Object.
      keys(opts).forEach((key) => {
        const val = opts[key]

        if (Number.parseInt(val, 10)) {
          opts[key] = Number.parseInt(val, 10)
        } else if (Number.parseFloat(val)) {
          opts[key] = Number.parseFloat(val)
        }
      })

    return adapter.count(filter, that.parseOptions(opts))
  }

  // define method of updataing objects with filter and modifier
  kupdate (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request
      const body = req.body

      let
        filter = null,
        modifier = null

      if (body && body.filter) filter = body.filter
      if (body && body.$filter) filter = body.$filter

      if (body && body.modifier) modifier = body.modifier
      if (body && body.$modifier) modifier = body.$modifier

      if (!filter) throw new Error(`can't find filter in context`)
      if (!modifier) throw new Error(`can't find modifier in context`)

      return yield adapter.update(filter, modifier)
    })
  }

  // define method of deleting objects with filter
  kdelete (ctx, adapter) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!adapter) throw new ReferenceError('invaild adapter')

    return co(function *() {
      const req = ctx.request
      const body = req.body

      let filter = null

      if (body && body.filter) filter = body.filter
      if (body && body.$filter) filter = body.$filter
      if (!filter) filter = body

      if (!filter) throw new Error(`can't find filter in context`)
      if (Object.keys(filter).length === 0) {
        throw new Error(`doesn't support delete all items`)
      }

      return yield adapter.delete(filter)
    })
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
