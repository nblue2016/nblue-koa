const nblue = require('nblue')
const ndata = require('nblue-data')
const aq = nblue.aq
const co = nblue.co
const ConfigMap = nblue.ConfigMap
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

class superWare
{

  initContext (ctx, name) {
    const that = this

    // init scope
    const config = ctx.config || new Map()
    const scopeConfigFile = `${__dirname}/${name}.yml`

    return co(function *() {
      // create new context
      const context = {}

      // parse default config
      const itemConfig = yield ConfigMap.parseConfig(scopeConfigFile)

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

      // get item settings
      const settings = itemConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        settings.set(key, val)
      }

      // bind settings to context
      context.settings = settings

      // create new instance of schemas
      const schemas = new Schemas()

      // parse schema by definition
      schemas.parseSchemas(that.getSchema())

      // bind schemas to context
      context.schemas = schemas

      // get type schema from
      const itemSchema = schemas.getSchema(name)

      // create new instance of database connections
      const conns = new DbConnections()

      conns.create(
        itemSchema.database,
        itemConfig.get('database').get('connection')
      )

      // bind connections to context
      context.conns = conns

      // get connection from connectoin by type name
      const conn = conns.getConnection(name)

      // bind connection to context
      context.conn = conn

      // return context
      return context
    })
  }


  getSchema () {
    return {}
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

}

module.exports = superWare
