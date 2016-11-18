const Router = require('koa-router')
const Adapter = require('./adapter')

const mwJson = require('koa-json-body')
const mwData = require('./../middleware/data')

const nblue = require('nblue')
// const aq = nblue.aq
const co = nblue.co

class restAdapter extends Adapter
{

  constructor (options) {
    super(options)

    this._test = 'ok'
  }

  createRouter (app, config) {
    const ctx = app.context
    const logger = ctx.logger
    const opts = {}

    if (config.has('prefix')) opts.prefix = config.get('prefix')

    const rootRouter = new Router(opts)

    // parse json body
    rootRouter.use(mwJson({}))
    rootRouter.use(mwData.koa())

    if (!ctx.schemas) {
      throw new Error('can\'t find schemas in context')
    }

    const schemas = ctx.schemas
    // remove prefix key for child routers

    if (config.has('prefix')) config.delete('prefix')
    for (const modelName of schemas.Cache.keys()) {
      const ropts = {
        prefix: `/${modelName}`,
        model: modelName
      }

      const router = super.createRouter(app, config, ropts)

      try {
        rootRouter.use(router.routes(), router.allowedMethods())
      } catch (err) {
        if (logger) {
          logger.err(`create router failed, details: ${err.message}`)
        }
      }
    }

    // catch the methods that doesn't supported in adapter
    rootRouter.all('*', super.disable())

    return rootRouter
  }

  getMethod (options) {
    const that = this
    const opts = options || {}
    const method = opts.method ? opts.method : ''
    const adapterFunc = that.getAdapter

    switch (method.toLowerCase()) {
    case 'test':
      return adapterFunc(that.mtest.bind(that), opts)
    case 'model':
      return function *() {
        const ctx = this
        const schemas = ctx.schemas
        const schema = schemas.getSchema(opts.model)

        ctx.type = 'json'
        ctx.body = schema ? schema.model : {}

        yield Promise.resolve(0)
      }
    case 'list':
      return adapterFunc(that.mlist.bind(that), opts)
    case 'retrieve':
      return adapterFunc(that.mretrieve.bind(that), opts)
    case 'get':
      return adapterFunc(that.mget.bind(that), opts)
    case 'create':
      return adapterFunc(that.mcreate.bind(that), opts)
    case 'query':
    case 'search':
      return adapterFunc(that.mquery.bind(that), opts)
    case 'count':
      return adapterFunc(that.mcount.bind(that), opts)
    case 'update':
    case 'delete':
      return function *() {
        const ctx = this

        ctx.body = {
          model: opts.model,
          method: opts.method,
          params: ctx.params
        }
        ctx.type = 'json'

        yield Promise.resolve(0)
      }
    default:
      return super.getMethod(opts)
    }
  }

  getAdapter (method, options) {
    const opts = options || {}

    return function *(next) {
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

          ctx.type = 'json'

          // apply method and set response body
          ctx.body = yield method(ctx, dataAdpt)
        } finally {
          yield conn.close()
        }
      } catch (err) {
        const message =
          `apply method:${opts.method} of ${opts.model} failed,
          details: ${err.message}`

        if (logger) logger.error(message, 'rest')

        ctx.throw('500', message)

        yield next
      }
    }
  }

  mtest (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      return yield Promise.resolve({ test: 'ok' })
    })
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

      return yield dataAdpt.get(params.id)
    })
  }

  mcreate (ctx, dataAdpt) {
    if (!ctx) throw new ReferenceError('invaild ctx')
    if (!dataAdpt) throw new ReferenceError('invaild dataAdpt')

    return co(function *() {
      const req = ctx.request

      const rt = yield dataAdpt.create(req.body)

      if (rt.toObject &&
          typeof rt.toObject === 'function') {
        return rt.toObject()
      }

      return { ok: '1' }
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

      return yield dataAdpt.retrieve(filter, opts)
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
