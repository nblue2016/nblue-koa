const core = require('nblue-core')

const aq = core.aq
const ConfigMap = core.ConfigMap

class RouterManager
{

  constructor (napp) {
    this._napp = napp
    this._configMaps = new Map()
  }

  get NApp () {
    return this._napp
  }

  get ConfigMaps () {
    return this._configMaps
  }

  parseConfigs (files) {
    const that = this
    const configMaps = that.ConfigMaps

    return aq.
      parallel(
        files.
          map((file) => that.getFullConfigFile(file)).
          map((file) => ConfigMap.parseConfig(file))
      ).
      then(
        (items) => items.
          filter((item) => item instanceof Map).
          filter((item) => item.has('name')).
          forEach((item) => configMaps.set(item.get('name'), item))
      )
  }

  getFullConfigFile (configFile) {
    const that = this
    const config = that.NApp.Config
    const settings = config.Settings

    // get base folder from config file or use current directory
    const base = settings.has('base') ? settings.get('base') : process.cwd()

    // return full path for configuration file
    return `${base}/${configFile}`
  }

  createRouter (routerConfigMap) {
    const that = this
    const napp = that.NApp

    const keys = napp.Keys
    const config = napp.Config
    const logger = napp.Logger
    const settings = config.Settings

    try {
      if (!routerConfigMap) {
        throw new Error(`Null reference of router config`)
      }

      // get the name of router adpater
      const routerName = routerConfigMap.get('name')

      // create empty map if router config hasn't settings
      if (!routerConfigMap.has(keys.Settings)) {
        routerConfigMap.set(keys.Settings, new Map())
      }

      // get settings from router config
      const routerSettings = routerConfigMap.get(keys.Settings)

      // merge settings in global settings to router settings
      for (const [key, val] of settings) {
        if (routerSettings.has(key)) continue
        routerSettings.set(key, val)
      }

      // get class of router adapter by name
      const Router = that.getRouter(routerName)

      // set merged settings to router config
      routerConfigMap.set(keys.Settings, routerSettings)

      // create new instance of router adapter by config map
      const router = new Router(napp, routerConfigMap)

      // bind router to application
      return router.bind()
    } catch (err) {
      // catch error
      const message = `create router failed, details: ${err.message}`

      if (logger) logger.error(message)

      return Promise.reject(err)
    }
  }

  getRouter (name) {
    switch (name.toLowerCase()) {
    case 'models':
    case 'rest':
    case 'nblue-rest':
    case 'nblue-models':
      return require('./router-models')
    case 'script':
    case 'nblue-script':
      return require('./router-script')
    case 'scope':
    case 'nblue-scope':
      return require('./router-scope')
    default:
      return require(name)
    }
  }

}

module.exports = RouterManager
