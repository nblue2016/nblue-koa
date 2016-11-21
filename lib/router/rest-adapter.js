const Router = require('koa-router')
const Adapter = require('./adapter')

const mwJson = require('./../middleware/json')
const mwData = require('./../middleware/data')

const nblue = require('nblue')
const StringBuilder = nblue.StringBuilder
const aq = nblue.aq
const co = nblue.co

class restAdapter extends Adapter
{

  createRouter (app, config) {
    // declare
    const that = this
    const ctx = app.context
    const logger = ctx.logger
    const settings = config.has('settings')
      ? config.get('settings')
      : new Map()

    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    // parse json body
    rootRouter.use(mwJson.koa())
    rootRouter.use(mwData.koa())

    if (!ctx.schemas) {
      throw new Error('can\'t find schemas in context')
    }

    const schemas = ctx.schemas

    // bind models function to root router
    if (settings.has('showModels') &&
      settings.get('showModels') === true) {
      rootRouter.get('/models', that.getMethod({ method: 'models' }))
    }


    // remove prefix key for child routers
    if (config.has('prefix')) config.delete('prefix')

    // fetch every model in schema
    for (const model of schemas.Keys) {
      // create new instance of router options
      const routerOpts = {
        prefix: `/${model}`,
        model,
        settings
      }

      try {
        // create new instance of router for current model
        const router = super.createRouter(app, config, routerOpts)

        // bind current router to root
        rootRouter.use(router.routes(), router.allowedMethods())
      } catch (err) {
        if (logger) {
          logger.err(`create router failed, details: ${err.message}`)
        }
      }
    }

    // catch the methods that doesn't supported in adapter
    rootRouter.all('*', super.disable())

    // return rest router
    return rootRouter
  }

  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''
    const adapterFunc = that.getAdapter

    switch (method.toLowerCase()) {
    // define method of model, show model schema by name
    case 'model':
      return function *() {
        const ctx = this
        const schemas = ctx.schemas
        const schema = schemas.getSchema(opts.model)

        ctx.type = 'json'
        ctx.body = schema ? schema.model : {}

        yield aq.then(0)
      }
    // define method of models, show names for all models
    case 'models':
      return function *() {
        const ctx = this
        const schemas = ctx.schemas
        const keys = schemas.Keys

        ctx.type = 'json'
        ctx.body = keys.filter((key) => {
          const schema = schemas.getSchema(key)

          if (!schema) return false

          const smOpts = schema.options || {}

          if (smOpts.hidden) return false

          return true
        })

        yield aq.then(0)
      }
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

  getAdapter (method, options) {
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

        // get settings from options
        const settings = opts.settings || new Map()

        // choose throw error or show json error message
        if (settings.has('jsonError') &&
            settings.get('jsonError') === false) {
          ctx.throw(500, err.message)
        }

        mwJson.throw(ctx, err, 500)
      }
    }
  }

  mlist (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      return yield dataAdpt.retrieve({})
    })
  }

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

  mquery (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      if (!filter) throw new Error(`can't find filter in context`)

      return yield dataAdpt.retrieve(filter, opts)
    })
  }

  maggregate (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)
      const opts = that.parseOptions(req.body)

      return yield dataAdpt.aggregate(filter, opts)
    })
  }

  mcount (ctx, dataAdpt) {
    const that = this

    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const filter = that.parseFilter(req.body)

      return yield dataAdpt.count(filter)
    })
  }

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

      return yield dataAdpt.update(filter, modifier)
    })
  }

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


      return yield dataAdpt.delete(filter)
    })
  }

  parseFilter (reqBody) {
    const body =
      reqBody && typeof reqBody === 'string'
      ? JSON.parse(reqBody)
      : reqBody || {}


    // parse query in body
    // if (body.query) return body.query
    // if (body.filter) return body.filter

    if (body.$query) return body.$query
    if (body.$filter) return body.$filter

    return body
  }

  parseOptions (reqBody) {
    const body =
      reqBody && typeof reqBody === 'string'
      ? JSON.parse(reqBody)
      : reqBody || {}

    // create new object for options
    const opts = {}

    // parse fields and sort and pager
    // if (body.fields) opts.fields = body.fields
    // if (body.limit) opts.limit = body.limit
    // if (body.skip) opts.skip = body.skip
    // if (body.sort) opts.sort = body.sort
    // if (body.page) opts.page = body.page
    // if (body.pageSize) opts.pageSize = body.pageSize

    if (body.$fields) opts.fields = body.$fields
    if (body.$limit) opts.limit = body.$limit
    if (body.$skip) opts.skip = body.$skip
    if (body.$sort) opts.sort = body.$sort
    if (body.$page) opts.page = body.$page
    if (body.$pageSize) opts.pageSize = body.$pageSize

    // return options
    return opts
  }

}

module.exports = restAdapter
