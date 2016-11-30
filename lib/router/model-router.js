// const Router = require('koa-router')
const SuperRouter = require('./super-router.js')
const nblue = require('nblue')
const aq = nblue.aq
const co = nblue.co
const StringBuilder = nblue.StringBuilder

class ModelRouter extends SuperRouter
{

  // get middleware by object method name
  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''
    const adapterFunc = that.getAdapter.bind(that)

    switch (method.toLowerCase()) {
    case 'model':
      return that.model(opts)
    case 'list':
      return adapterFunc(that.mlist.bind(that), opts)
    case 'retrieve':
      return adapterFunc(that.mretrieve.bind(that), opts)
    case 'get':
      return adapterFunc(that.mget.bind(that), opts)
    case 'getup':
      return adapterFunc(that.mgetup.bind(that), opts)
    case 'getdel':
      return adapterFunc(that.mgetdel.bind(that), opts)
    case 'create':
      return adapterFunc(that.mcreate.bind(that), opts)
    case 'query':
    case 'search':
      return adapterFunc(that.mquery.bind(that), opts)
    case 'aggregate':
      return adapterFunc(that.maggregate.bind(that), opts)
    case 'count':
      return adapterFunc(that.mcount.bind(that), opts)
    case 'update':
      return adapterFunc(that.mupdate.bind(that), opts)
    case 'upsert':
      return adapterFunc(that.mupsert.bind(that), opts)
    case 'delete':
      return adapterFunc(that.mdelete.bind(that), opts)
    default:
      return super.getMethod(opts)
    }
  }

  // get data adapter by object name
  getAdapter (method, options) {
    const that = this
    const opts = options || {}

    return function *() {
      const ctx = this
      const logger = ctx ? ctx.logger : null

      try {
        if (!opts.model) throw new Error('can\'t find model.')

        const name = opts.model
        const conns = ctx.conns ? ctx.conns : null

        const conn = conns.getConnectionByEntity(name)

        yield conn.open()

        try {
          // const model = schema.model
          const dataAdpt = yield conns.getAdapter(name)

          // get result of apply method
          const rt = yield method(ctx, dataAdpt)

          // apply method and set response body
          ctx.type = 'json'
          ctx.body = rt
        } finally {
          yield conn.close()
        }
      } catch (err) {
        const sb = new StringBuilder()

        sb.append(`apply ${opts.model}/${opts.method} failed, `)
        sb.append(`details: ${err.message}`)

        const message = sb.toString()

        if (logger) logger.error(message, 'rest')

        err.code = 500
        err.message = message

        // throw error
        that.throw(ctx, err, err.code)
      }
    }
  }

  // define method of getting all objects
  mlist (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      return yield dataAdpt.retrieve({})
    })
  }

  // define method of getting objects with one conditon by request path
  mretrieve (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const filter = {}
      const params = ctx.params

      if (!params.key) throw new Error('can\'t find key')

      filter[params.key] = params.val

      return yield dataAdpt.retrieve(filter)
    })
  }

  // define method of getting an object with identity
  mget (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const params = ctx.params

      const rt = yield dataAdpt.get(params.id)

      if (rt === null) {
        throw new Error(`can't find object by id:${params.id}`)
      }

      return rt
    })
  }

  // define method of getting an object with identity and updating
  mgetup (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const params = ctx.params
      const req = ctx.request
      const item = yield dataAdpt.get(params.id)

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
  mgetdel (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const params = ctx.params
      const item = yield that.mget(ctx, dataAdpt)

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
  mcreate (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request
      const body = req.body

      if (!body) throw new Error(`can't find body in context`)

      return yield dataAdpt.create(body)
    })
  }

  // define method of update object with filter,
  // it will create a new one if matched object wasn't found
  mupsert (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    const that = this

    return co(function *() {
      const req = ctx.request
      const body = req.body

      if (!body) throw new Error(`can't find body in context`)

      const methodFunc = dataAdpt.upsert

      if (methodFunc &&
          typeof methodFunc === 'function') {
        return yield methodFunc(body)
      }

      const rt = yield that.mupdate(ctx, dataAdpt)

      if (rt.nModified === 0) {
        let modifier = null

        if (body && body.modifier) modifier = body.modifier
        if (body && body.$modifier) modifier = body.$modifier

        yield dataAdpt.create(modifier)

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
  mquery (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      if (!filter) throw new Error(`can't find filter in context`)

      const rt = yield dataAdpt.retrieve(filter, opts)

      return rt
    })
  }

  // define method of counting objects with filter
  maggregate (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      const rt = yield dataAdpt.aggregate(filter, opts)

      return rt
    })
  }

  // define method of counting objects with filter
  mcount (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)

      const rt = yield dataAdpt.count(filter)

      return rt
    })
  }

  // define method of updataing objects with filter and modifier
  mupdate (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

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

      const rt = yield dataAdpt.update(filter, modifier)

      return rt
    })
  }

  // define method of deleting objects with filter
  mdelete (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

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

      const rt = yield dataAdpt.delete(filter)

      return rt
    })
  }

  // define method of model, show model schema by name
  model (options) {
    const opts = options || {}

    return function *() {
      const ctx = this
      const schemas = ctx.schemas
      const schema = schemas.getSchema(opts.model)

      ctx.type = 'json'
      ctx.body = schema ? schema.model : {}

      yield aq.then(0)
    }
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

    // return options
    return opts
  }

}

module.exports = ModelRouter