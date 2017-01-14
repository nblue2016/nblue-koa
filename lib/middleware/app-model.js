const nblue = require('nblue-core')
// const ndata = require('nblue-data')
const SuperApp = require('./app-super')

const aq = nblue.aq
const co = nblue.co
const ConfigMap = nblue.ConfigMap
// const Schemas = ndata.Schemas
// const DbConnections = ndata.DbConnections

class ModelApp extends SuperApp
{

  get AppName () {
    throw new Error('undefined')
  }

  get AppSchemas () {
    throw new Error('undefined')
  }

  init (ctx) {
    const that = this

    // init variants
    const nkoa = that.Nkoa
    const name = that.AppName
    const config = that.Config
    const schemas = that.Schemas

    const keys = nkoa.Keys
    const amgr = nkoa.ApplicationManager

    const itemConfigFile = `${__dirname}/${name}.yml`

    return co(function *() {
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

      // set model settings
      // nkoa.setObject(ctx, keys.Config, itemConfig)

      // get item settings
      const settings = itemConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        settings.set(key, val)
      }

      if (!schemas.Schema(name)) {
        // parse schema by definition
        schemas.parseSchemas(that.AppSchemas)
      }

      // init variants
      let
        conns = nkoa.getObject(ctx, keys.Connections),
        newInstance = false

      if (!conns) {
        // get instance of data application
        const dataApp = amgr.getApplication('data')

        // create new instance of database connections if it can't be found
        conns = dataApp.createConnections({ schemas })
        // conns = new DbConnections(schemas)
        newInstance = true
      }

      // register connection for current model
      conns.registerConnection(
        name,
        itemConfig.get('database').get('connection')
      )

      // bind connections to context
      if (newInstance) {
        nkoa.setObject(ctx, keys.Connections, conns)
      }
    })
  }

}

module.exports = ModelApp
