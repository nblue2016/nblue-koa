// reference libraries
const core = require('nblue-core')

// use classess
const Constants = require('.././constants')
const aq = core.aq
const co = core.co
const ConfigMap = core.ConfigMap

// define constant
const CONFIG_KEY_OF_CONTROLLERS = 'controllers'

const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_ROUTER_SOURCEFILE = 'src'
const CONFIG_KEY_OF_ROUTER_TARGET = 'target'

class ControllerManager {

  constructor (nblue) {
    this._nblue = nblue
    this._controllersConfig = new ConfigMap()
  }

  get NBlue () {
    return this._nblue
  }

  get ControllersConfig () {
    return this._controllersConfig
  }

  get WebConfig () {
    return this.NBlue.Config
  }

  get WebSettings () {
    return this.WebConfig ? this.WebConfig.Settings : null
  }

  getLogger () {
    return this.NBlue.getLogger()
  }

  parseConfigs (files) {
    const that = this
    const configMaps = this.ControllersConfig

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
    const base = this.NBlue.getBaseFolder()

    // return full path for configuration file
    return `${base}/${configFile}`
  }

  registerController (name, controllerConfig) {
    // get parsed controllers map
    const config = this.ControllersConfig

    // register config of new controller to parsed map
    config.set(name, controllerConfig)
  }

  getControllerConfigs () {
    // get parsed controllers map
    const config = this.ControllersConfig

    // create new instance of contorller maps
    const newConfig = new ConfigMap()

    // fetch every item in config maps,
    // we need parse if config includes many controls
    for (const [name, controllerConfig] of config) {
      if (!controllerConfig.has(CONFIG_KEY_OF_CONTROLLERS)) {
        // only append config to new config maps
        newConfig.set(name, controllerConfig)

        // ignore current config map
        continue
      }

      // found controllers section in config, it means the config includes more
      // than one router, we need fetch every items
      for (const item of controllerConfig.get(CONFIG_KEY_OF_CONTROLLERS)) {
        // clone new instance of current config map
        const controllerMap = controllerConfig.clone()

        // remove controllers section in new map
        controllerMap.delete(CONFIG_KEY_OF_CONTROLLERS)

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
        newConfig.set(item.get('name'), controllerMap)
      }
    }

    // return new config maps
    return newConfig
  }

  createControllerByMap (controllerConfigMap) {
    // get instance of nblue application
    const nblue = this.NBlue

    // get instance of logger
    const logger = this.getLogger()

    // get config from nblue application
    const config = nblue.Config

    // get settings from config
    const settings = config.Settings

    const gen = function *() {
      try {
        if (!controllerConfigMap) {
          throw new Error(`Null reference of router config`)
        }

        // get the name of contorler
        const name = controllerConfigMap.get('name')

        // create empty map if controller config hasn't settings
        if (!controllerConfigMap.has(Constants.KeyOfSettings)) {
          controllerConfigMap.set(Constants.KeyOfSettings, new Map())
        }

        // get settings from controller config
        const controllerSettings =
          controllerConfigMap.get(Constants.KeyOfSettings)

        // merge settings in global settings to router settings
        for (const [key, val] of settings) {
          if (controllerSettings.has(key)) continue
          controllerSettings.set(key, val)
        }

        // get source file from router config map
        const srcFile = controllerConfigMap.has(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
          ? controllerConfigMap.get(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
          : null

        const target = controllerConfigMap.has(CONFIG_KEY_OF_ROUTER_TARGET)
          ? controllerConfigMap.get(CONFIG_KEY_OF_ROUTER_TARGET)
          : null

        // declare
        let controller = null

        // set merged settings to router config
        controllerConfigMap.set(Constants.KeyOfSettings, controllerSettings)

        if (target && srcFile === null) {
          controller = target
        } else {
          // get class of router adapter by name
          const Controller = this.getController(name, srcFile)

          // create new instance of router adapter by config map
          controller = new Controller(nblue, controllerConfigMap)
        }


        // bind controller to router
        return yield aq.then(controller.bind())
      } catch (err) {
        // catch error
        const message = `create router failed, details: ${err.message}`

        // append error info to logger
        if (logger) logger.error(message, err)

        // reject error
        throw err
      }
    }

    return co(gen.bind(this))
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
        const base = this.NBlue.getBaseFolder(this.WebSettings)

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
        logger.verbose(`get class for controller (${name}) ok.`)
      }

      // return class of contorler
      return controllerClass
    } catch (err) {
      // append error to logger
      if (logger) {
        logger.error(`get class for controller (${name}) failed.`, err)
      }

      // return null if get router by name failed
      return null
    }
  }

}

module.exports = ControllerManager
