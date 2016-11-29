const nblue = require('nblue')
const ndata = require('nblue-data')
const aq = nblue.aq
const co = nblue.co
const ConfigMap = nblue.ConfigMap
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

class superWare
{

  constructor (app) {
    this._app = app
  }

  get App () {
    return this._app
  }

  initContext (ctx, name) {
    const that = this

    // init variants
    const config = ctx.config || new Map()
    const itemConfigFile = `${__dirname}/${name}.yml`

    return co(function *() {
      // create new context
      const context = {}

      // parse default config
      const itemConfig = yield ConfigMap.parseConfig(itemConfigFile)

      // get type section from global config
      if (config.has(name)) {
        // get custome file name
        const customConfigFile = (() => {
          if (!config.has(name)) return null
          if (!config.get(name).has('config')) return null

          return config.get(name).get('config')
        })()

        // parse custom config
        const customConfig = yield (() => {
          if (!customConfigFile) return aq.then(null)

          return ConfigMap.parseConfig(customConfigFile)
        })()

        // merge default and custom config
        if (customConfig) itemConfig.merge(customConfig)
      }

      // bind config to context
      context.config = itemConfig
      context.cf$ = itemConfig

      // get item settings
      const settings = itemConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        settings.set(key, val)
      }

      // bind settings to context
      context.settings = settings
      context.set$ = settings

      // get schema definition
      const definedSchema = that.getSchema()

      if (definedSchema) {
        // create new instance of schemas
        const schemas = new Schemas()

        // parse schema by definition
        schemas.parseSchemas(definedSchema)

        // bind schemas to context
        context.schemas = schemas
        context.ss$ = schemas

        // get type schema from
        const itemSchema = schemas.getSchema(name)

        // bind item schema to context
        context.schema = itemSchema

        // create new instance of database connections
        const conns = new DbConnections(schemas)

        conns.create(
          itemSchema.database,
          itemConfig.get('database').get('connection')
        )

        // bind connections to context
        context.conns = conns
        context.cs$ = conns

        // get connection from connectoin by type name
        // const conn = conns.getConnection(itemSchema)

        // bind connection to context
        // context.conn = conn

        context.getConnection =
          () => conns.createConnection(itemSchema.database)
      }

      // return context
      return context
    })
  }

  getSchema () {
    return null
  }

  getContext (ctx, name) {
    const that = this
    const key = `${name}$`

    return co(function *() {
      if (!ctx[key]) {
        const app = ctx.app

        app.context[key] = yield that.initContext(ctx, name)
      }

      return aq.then(ctx[key])
    })
  }

  createKoa () {
    const that = this
    const doneFunc = that.done.bind(that)

    return function *(next) {
      const ctx = this

      return yield doneFunc(ctx, next)
    }
  }

  createKoa2 () {
    const that = this
    const doneFunc = that.done.bind(that)

    return function (ctx, next) {
      return doneFunc(ctx, next)
    }
  }

  done () {
    return Promise.resolve(null)
  }

  createExpress () {
    const that = this
    const doneFunc = that.done.bind(that)

    return function (req, res, next) {
      const ctx = {
        request: req,
        response: res,
        app: that.App
      }

      return doneFunc(ctx, next)
    }
  }

}

module.exports = superWare
