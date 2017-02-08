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

  get ModelName () {
    return null
  }

  get Database () {
    return this.ModelName
  }

  get ModelSchemas () {
    return null
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
    // assign this to that
    const that = this

    // get instance of name, global config and global schemas
    const name = that.ModelName
    const config = that.Config

    // init variants
    const amgr = that.Nkoa.ApplicationManager
    const dataApp = amgr.getApplication('data')


    if (dataApp) {
      const schemas = dataApp.Schemas
      const modelSchemas = that.Schemas

      // check current schemas was parsed by name before
      if (modelSchemas && !schemas.Schema(name)) {
        // parse schema by definition
        schemas.parseSchemas(that.ModelSchemas)
      }
    }

    // parse config file for current model
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
          // parse custom config for current model if need
          const customConfig = yield ConfigMap.parseConfig(customConfigFile)

          // merge default and custom config
          if (customConfig) modelConfig.merge(customConfig)
        }
      }

      const keys = that.Nkoa.Keys
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

      if (cs) {
        // register connection string in data application
        if (dataApp) dataApp.registerConnectionString(that.Database, cs)

        // save connection string to cache
        modelCache.set(KEY_OF_CONNECTIONS_STRING, cs)
      }

      that.modelCreate()
    })
  }

  modelCreate () {
    return
  }

  getConnectoinString () {
    // get instance of nkoa
    const nkoa = this.Nkoa

    // get instance of model config
    const modelConfig = this.ModelConfig

    // init variant
    let cs = null

    if (modelConfig.has('database')) {
      // get database section from model config
      const dbs = modelConfig.get('database')

      // check type of section
      if (typeof dbs === 'object') {
        // get connection string from model config
        cs = dbs.get('connection')
      } else if (typeof dbs === 'string') {
        // init variants
        const amgr = nkoa.ApplicationManager
        const dataApp = amgr.getApplication('data')

        cs = dataApp.getConnectoinStringByName(dbs)
      }
    }

    // return connection string
    return cs
  }

}

module.exports = ModelApp