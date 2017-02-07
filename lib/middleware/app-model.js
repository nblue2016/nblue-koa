const nblue = require('nblue-core')
const SuperApp = require('./app-super')

const co = nblue.co
const ConfigMap = nblue.ConfigMap

const KEY_OF_CONNECTIONS_STRING = 'connectionString'

class ModelApp extends SuperApp
{

  get CacheKey () {
    return `~${this.ModelName}~cache`
  }

  get DataBase () {
    return this.ModelName
  }

  get ModelName () {
    throw new Error('undefined')
  }

  get ModelSchemas () {
    throw new Error('undefined')
  }

  get ModelConfig () {
    const nkoa = this.Nkoa
    const keys = nkoa.Keys
    const modelCache = this.ModelCache

    return modelCache.has(keys.Config)
      ? modelCache.get(keys.Config)
      : new Map()
  }

  get ModelSettings () {
    const nkoa = this.Nkoa
    const keys = nkoa.Keys
    const modelCache = this.ModelCache

    return modelCache.has(keys.Settings)
      ? modelCache.get(keys.Settings)
      : new Map()
  }

  get ModelCache () {
    const cacheKey = this.CacheKey
    const modelCache = this.Nkoa.AppCache

    if (!modelCache.has(cacheKey)) {
      modelCache.set(cacheKey, new Map())
    }

    return modelCache.get(cacheKey)
  }

  create () {
    const that = this
    const nkoa = that.Nkoa

    const name = that.ModelName
    const config = that.Config
    const schemas = that.Schemas

    // check current schemas was parsed by name before
    if (!schemas.Schema(name)) {
      // parse schema by definition
      schemas.parseSchemas(that.ModelSchemas)
    }

    return co(function *() {
      // get default config file name for current model
      const modelConfigFile = `${__dirname}/${name}.yml`

      // parse default config
      const modelConfig = yield ConfigMap.parseConfig(modelConfigFile)

      // merge custom config file
      if (config.has(name)) {
        // get section from config for current model
        const modelSection = config.get(name)

        // get custome config file name
        const customConfigFile =
          modelSection.has('config') ? modelSection.get('config') : null

        if (customConfigFile) {
          // parse custom config for current model
          const customConfig = yield ConfigMap.parseConfig(customConfigFile)

          // merge default and custom config
          if (customConfig) modelConfig.merge(customConfig)
        }
      }

      const keys = nkoa.Keys
      const modelCache = that.ModelCache
      const settings = modelConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        settings.set(key, val)
      }

      // save config to app cache
      modelCache.set(keys.Config, modelConfig)
      modelCache.set(keys.Settings, settings)

      // get connection string form config
      const cs = that.getConnectoinString()

      // save connection string to cache
      if (cs) modelCache.set(KEY_OF_CONNECTIONS_STRING, cs)
    })
  }

  init (ctx) {
    const that = this
    const modelCache = that.ModelCache

    if (modelCache.has(KEY_OF_CONNECTIONS_STRING)) {
      const cs = modelCache.get(KEY_OF_CONNECTIONS_STRING)

      if (cs) {
        // init variants
        const amgr = that.Nkoa.ApplicationManager

        // regiester connections for current model
        amgr.
          getApplication('data').
          registerConnections(
            ctx,
            { schemas: that.Schemas },
            (conns) => conns.registerConnection(that.ModelName, cs)
          )
      }
    }

    return Promise.resolve(0)
  }

  getConnectoinString () {
    // assign this to that
    const that = this

    // get global config and model config
    const config = that.Config
    const modelConfig = that.ModelConfig

    // init variant
    let cs = null

    if (modelConfig.has('database')) {
      // get database section from model config
      const dbs = modelConfig.get('database')

      // check type of section
      if (typeof dbs === 'object') {
        // get connection string from model config
        cs = dbs.get('connection')
      } else if (typeof dbs === 'string' && config.has('connections')) {
        // get connection string from global config
        cs = config.
          getArray('connections').
          filter((item) => item.has(dbs)).
          map((item) => item.get(dbs))

        // get the first matched value
        if (cs.length > 0) cs = cs[0]
      }
    }

    return cs
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
