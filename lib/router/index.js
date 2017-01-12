const nblue = require('nblue-core')

const co = nblue.co
const ConfigMap = nblue.ConfigMap

class RouterManager
{

  constructor (nkoa) {
    this._nkoa = nkoa
  }

  get Nkoa () {
    return this._nkoa
  }

  createRouter (configFile) {
    const that = this
    const nkoa = that.Nkoa

    const keys = nkoa.Keys
    const config = nkoa.Config
    const settings = config.Settings
    const logger = nkoa.Logger

    try {
      if (!configFile) {
        throw new Error(`can't find config by file:${configFile}`)
      }

      return co(function *() {
        // get base folder from config file or use current directory
        const base = config.has('base') ? config.get('base') : process.cwd()

        // parse full config name
        const routeConfigFile = `${base}/${configFile}`

        // create config map by file name
        const routerConfigMap = yield ConfigMap.parseConfig(routeConfigFile)

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

        // get the name of router adpater
        const routerName = routerConfigMap.get('name')

        // get class of router adapter by name
        const Router = that.getRouter(routerName)

        // set merged settings to router config
        routerConfigMap.set(keys.Settings, routerSettings)

        // create new instance of router adapter by config map
        const router = new Router(nkoa, routerConfigMap)

        // bind router to application
        return router.bind()
      })
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
