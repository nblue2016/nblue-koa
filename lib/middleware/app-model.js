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

  get AppConfig () {
    const nkoa = this.Nkoa
    const keys = nkoa.Keys

    const boxes = this.AppBox

    return boxes.has(keys.Config)
      ? boxes.get(keys.Config)
      : new Map()
  }

  get AppSettings () {
    const nkoa = this.Nkoa
    const keys = nkoa.Keys

    const boxes = this.AppBox

    return boxes.has(keys.Settings)
      ? boxes.get(keys.Settings)
      : new Map()
  }

  get AppBox () {
    const boxKey = `~${this.AppName}~`
    const boxes = this.Nkoa.Boxes

    if (!boxes.has(boxKey)) {
      boxes.set(boxKey, new Map())
    }

    return boxes.get(boxKey)
  }

  init (ctx) {
    const that = this

    // init variants
    const nkoa = that.Nkoa
    const name = that.AppName
    const box = that.AppBox
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

      // get item settings
      const settings = itemConfig.Settings

      // save config to app box
      box.set(keys.Config, itemConfig)
      box.set(keys.Settings, settings)

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        settings.set(key, val)
      }

      if (!schemas.Schema(name)) {
        // parse schema by definition
        schemas.parseSchemas(that.AppSchemas)
      }

      amgr.
        getApplication('data').
        registerConnections(
          ctx,
          { schemas },
          (conns) => {
            // get connection string form config
            const cs = itemConfig.get('database').get('connection')

            // register connection for current model
            conns.registerConnection(name, cs)
          }
        )
    })
  }

  getConnection (ctx) {
    const that = this

    // init variants
    const nkoa = that.Nkoa
    const keys = nkoa.Keys

    return nkoa.getObject(ctx, keys.Connections)
  }

}

module.exports = ModelApp
