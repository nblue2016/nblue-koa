const core = require('nblue-core')
const Component = require('./super')

const co = core.co
const ConfigMap = core.ConfigMap

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

  create () {
    // assign this to that
    const that = this

    // get instance of name and config
    const name = that.ModelName
    const config = that.WebConfig

    // get instance of data application
    const dataApp = that.getAppByName('data')


    if (dataApp) {
      const schemas = dataApp.Schemas
      const modelSchemas = that.ModelSchemas

      // check current schemas was parsed by name before
      if (modelSchemas && !schemas.Schema(name)) {
        // parse schema by definition
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

      const keys = that.NApp.Keys
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
      } else if (typeof dbs === 'string') {
        // get instance of data application
        const dataApp = this.getAppByName('data')

        // get connection string by name
        cs = dataApp.getConnectoinStringByName(dbs)
      }
    }

    // return connection string
    return cs
  }

}

module.exports = ModelComponent
