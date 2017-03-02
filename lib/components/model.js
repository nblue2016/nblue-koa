// reference libraries
const core = require('nblue-core')

// use classes
const Component = require('./super')
const co = core.co
const ConfigMap = core.ConfigMap

// define constrants
const CONFIG_KEY_OF_CONNECTIONS_STRING = 'connectionString'

class ModelComponent extends Component
{

  constructor (napp) {
    super(napp)

    this._isCreated = false
  }

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
    const keys = this.NApp.Keys
    const modelCache = this.ModelCache

    return modelCache.has(keys.Config)
      ? modelCache.get(keys.Config)
      : new Map()
  }

  get ModelSettings () {
    const napp = this.NApp
    const keys = napp.Keys
    const modelCache = this.ModelCache

    return modelCache.has(keys.Settings)
      ? modelCache.get(keys.Settings)
      : new Map()
  }

  get ModelCache () {
    const cacheKey = this.CacheKey
    const modelCache = this.NApp.AppCache

    if (!modelCache.has(cacheKey)) {
      modelCache.set(cacheKey, new Map())
    }

    return modelCache.get(cacheKey)
  }

  get IsCreated () {
    return this._isCreated
  }

  getLogger () {
    return super.getLogger(this.ModelName)
  }

  getDataComponent () {
    return this.getComponentByName('data')
  }

  create () {
    // assign this to that
    const that = this

    // get instance of name and config
    const name = this.ModelName
    const config = this.WebConfig

    // get instance of data application
    const dc = this.getComponentByName('data')

    // get database name
    const database = this.Database

    if (dc) {
      // get full schemas and model schemas
      const schemas = dc.Schemas
      const modelSchemas = that.ModelSchemas

      // check current schemas was parsed by name before
      if (modelSchemas && !schemas.Schema(name)) {
        // full schemas parse and append model schemas
        schemas.parseSchemas(modelSchemas)
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

        if (modelSection.has('config')) {
          // get custome config file name
          const customConfigFile = modelSection.get('config')

          // found defined config file
          if (customConfigFile) {
            // parse custom config for current model if need
            const customConfig = yield ConfigMap.parseConfig(customConfigFile)

            // throw error if parse failed
            if (!customConfig) {
              throw new Error(
                `parse config file ${customConfigFile} failed`
              )
            }

            // merge default and custom config
            modelConfig.merge(customConfig)
          }
        } else {
          // model config merge model section from web config
          modelConfig.merge(modelSection)
        }
      }

      const keys = that.NApp.Keys
      const modelCache = that.ModelCache
      const settings = modelConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        // append new key with value
        settings.set(key, val)
      }

      // save config to app cache
      modelCache.set(keys.Config, modelConfig)
      modelCache.set(keys.Settings, settings)

      // get connection string form config
      const cs = that.getConnectoinString()

      if (cs) {
        // register connection string in data component
        if (dc) dc.registerConnectionString(database, cs)

        // save connection string to cache
        modelCache.set(CONFIG_KEY_OF_CONNECTIONS_STRING, cs)
      }

      that.modelCreate()

      that.onCreated()
    })
  }

  onCreated () {
    this._isCreated = true
  }

  modelCreate () {
    return
  }

  getConnectoinString () {
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

        // if connection string doesn't include protocol
        // we consider it is a name of connection string in web config
        if (cs.indexOf('://') < 0) {
          // get instance of data component
          const dc = this.getComponentByName('data')

          // get connection string from data component by name
          cs = dc.getConnectoinStringByName(cs)
        }
      } else if (typeof dbs === 'string') {
        // get instance of data application
        const dt = this.getComponentByName('data')

        // get connection string by name
        cs = dt.getConnectoinStringByName(dbs)
      }
    }

    // return connection string
    return cs
  }

}

module.exports = ModelComponent
