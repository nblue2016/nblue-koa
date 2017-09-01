// reference libraries
const core = require('nblue-core')

// use classes
// const Constants = require('.././constants')
const Component = require('./super')
const aq = core.aq
const co = core.co
const Cache = core.Cache
const ConfigMap = core.ConfigMap

// define constants
// const CONFIG_KEY_OF_CONNECTIONS_STRING = 'connectionString'

class ModelComponent extends Component
{

  constructor (nblue) {
    super(nblue)

    this._cache = null
    this._isCreated = false

    this._modelConfig = new ConfigMap()
    this._modelSettings = this._modelConfig.Settings
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
    return this._modelConfig
  }

  get ModelSettings () {
    return this._modelSettings
  }

  get ModelCache () {
    // try to create new instance of cache when it is used in the first time
    if (this._cache === null) {
      this._cache = this.createCache()
    }

    return this._cache
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

  create (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of name and config
    const name = this.ModelName
    const config = this.NConfig

    // get instance of data application
    const dc = this.getComponentByName('data')

    // get database name
    const database = this.Database

    if (dc) {
      // get full schemas and model schemas
      const schemas = dc.Schemas
      const modelSchemas = this.ModelSchemas

      // check current schemas was parsed by name before
      if (modelSchemas && !schemas.Schema(name)) {
        // full schemas parse and append model schemas
        schemas.parseSchemas(modelSchemas)
      }
    }

    // parse config file for current model
    const gen = function *() {
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

      // const modelCache = that.ModelCache
      const settings = modelConfig.Settings

      // copy settings from global to item config
      for (const [key, val] of config.Settings) {
        if (settings.has(key)) continue

        // append new key with value
        settings.set(key, val)
      }

      // save config to app cache
      // modelCache.setItem(Constants.KeyOfConfig, modelConfig)
      // modelCache.setItem(Constants.KeyOfSettings, settings)
      this._modelConfig = modelConfig
      this._modelSettings = settings

      // get connection string form config
      const cs = this.getConnectoinString()

      if (cs) {
        // register connection string in data component
        if (dc) dc.registerConnectionString(database, cs)

        // save connection string to cache
        // modelCache.setItem(CONFIG_KEY_OF_CONNECTIONS_STRING, cs)
      }

      yield aq.then(this.modelCreate(opts))

      this.onCreated()
    }

    // execute generator function
    return co(gen.bind(this))
  }

  createCache () {
    // get key of cache
    const cacheKey = this.CacheKey

    // create new instance of cache if it wasn't created
    // try to get instance of cache component
    const cacheComp = this.getComponentByName('cache')

    // try to get session cache from cache component
    if (cacheComp) {
      // try to get cache from cache component
      const cache = cacheComp.getCacheByName(cacheKey)

      // return cache if it was found
      if (cache) return cache
    }

    // return new original cache
    return new Cache()
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

  check () {
    // get instance of logger
    const logger = this.getLogger()

    // disable middleware for current component
    if (!this.IsCreated) {
      if (logger) {
        // append warning message to logger
        logger.warning(
          `The ${this.ModelName} component wasn't created before use.`
        )
      }

      return false
    }

    return true
  }

}

module.exports = ModelComponent
