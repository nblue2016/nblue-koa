// use namespace
const core = require('nblue-core')

// use classess
const aq = core.aq
const ConfigMap = core.ConfigMap

// define constant
const CONFIG_KEY_OF_CONTROLERS = 'controllers'

const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_ROUTER_SOURCEFILE = 'src'

class ControllerManager {

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

  get WebConfig () {
    return this.NApp.Config
  }

  get WebSettings () {
    return this.WebConfig ? this.WebConfig.Settings : null
  }

  getLogger () {
    return this.NApp.getLogger()
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
          filter((item) => item.has(CONFIG_KEY_OF_ROUTER_NAME)).
          forEach((item) => configMaps.set(
            item.get(CONFIG_KEY_OF_ROUTER_NAME), item)
          )
      )
  }

  getFullConfigFile (configFile) {
    // get base folder from config file or use current directory
    const base = this.NApp.getBaseFolder()

    // return full path for configuration file
    return `${base}/${configFile}`
  }

  getControllerConfigs () {
    const configMaps = this.ConfigMaps
    const newConfigMaps = new Map()

    // fetch every item in config maps,
    // we need parse if config includes many controls
    for (const [name, configMap] of configMaps) {
      if (!configMap.has(CONFIG_KEY_OF_CONTROLERS)) {
        // only append config to new config maps
        newConfigMaps.set(name, configMap)

        // ignore current config map
        continue
      }

      // found controllers section in config, it means the config includes more
      // than one router, we need fetch every items
      for (const item of configMap.get(CONFIG_KEY_OF_CONTROLERS)) {
        // clone new instance of current config map
        const controllerMap = configMap.clone()

        // remove controllers section in new map
        controllerMap.delete(CONFIG_KEY_OF_CONTROLERS)

        // clone item config to contorler
        for (const [key, val] of item) {
          if (key !== 'settings') {
            controllerMap.set(key, val)
            continue
          }

          // get settings item from controller map
          const settings = controllerMap.has(key)
            ? controllerMap.get(key)
            : controllerMap.set(key, new Map())

          // fetch every item in settings
          for (const [sKey, sVal] of val) {
            settings.set(sKey, sVal)
          }
        }

        // append new map to maps
        newConfigMaps.set(item.get('name'), controllerMap)
      }
    }

    // return new config maps
    return newConfigMaps
  }

  createControllerByMap (controllerConfigMap) {
    const that = this
    const napp = this.NApp
    const logger = this.getLogger()

    const keys = napp.Keys
    const config = napp.Config
    const settings = config.Settings

    try {
      if (!controllerConfigMap) {
        throw new Error(`Null reference of router config`)
      }

      // get the name of contorler
      const name = controllerConfigMap.get('name')

      // create empty map if controller config hasn't settings
      if (!controllerConfigMap.has(keys.Settings)) {
        controllerConfigMap.set(keys.Settings, new Map())
      }

      // get settings from controller config
      const controllerSettings = controllerConfigMap.get(keys.Settings)

      // merge settings in global settings to router settings
      for (const [key, val] of settings) {
        if (controllerSettings.has(key)) continue
        controllerSettings.set(key, val)
      }

      // get source file from router config map
      const srcFile = controllerConfigMap.has(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
        ? controllerConfigMap.get(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
        : null

      // get class of router adapter by name
      const Controller = that.getController(name, srcFile)

      // set merged settings to router config
      controllerConfigMap.set(keys.Settings, controllerSettings)

      // create new instance of router adapter by config map
      const controller = new Controller(napp, controllerConfigMap)

      // bind controller to router
      return controller.bind()
    } catch (err) {
      // catch error
      const message = `create router failed, details: ${err.message}`

      if (logger) logger.error(message, err)

      return Promise.reject(err)
    }
  }

  getController (name, controllerFile) {
    // get instance of logger
    const logger = this.getLogger()

    try {
      // declare
      let controllerClass = null

      // parse controller by file
      if (controllerFile) {
        // get base folder from settings
        const base = this.NApp.getBaseFolder(this.WebSettings)

        // return new Class of controller by path
        controllerClass = require(`${base}/${controllerFile}`)
      } else {
        // try to get inner-controller by name
        switch (name.toLowerCase()) {
        case 'models':
        case 'rest':
        case 'nblue-models':
        case 'nblue-rest':
          controllerClass = require('./models')
          break
        case 'script':
        case 'nblue-script':
          controllerClass = require('./script')
          break
        case 'scope':
        case 'nblue-scope':
          controllerClass = require('./scope')
          break
        default:
          controllerClass = require(name)
          break
        }
      }

      // append created info to logger
      if (logger) {
        logger.verbose(`get class of controller ${name} ok.`)
      }

      // return class of contorler
      return controllerClass
    } catch (err) {
      // append error to logger
      if (logger) {
        logger.error(`get class of controller ${name} failed.`, err)
      }

      // return null if get router by name failed
      return null
    }
  }

}

module.exports = ControllerManager
