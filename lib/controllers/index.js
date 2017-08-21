// reference libraries
const core = require('nblue-core')

// use classess
const Constants = require('.././constants')
const aq = core.aq
const co = core.co
const ConfigMap = core.ConfigMap

// define constant
const CONFIG_KEY_OF_CONTROLLERS = 'controllers'

const CONFIG_KEY_OF_SETTINGS = 'settings'
const CONFIG_KEY_OF_ROUTER_NAME = 'name'
const CONFIG_KEY_OF_ROUTER_SOURCEFILE = 'src'
const CONFIG_KEY_OF_ROUTER_TARGET = 'target'

class ControllerManager {

  constructor (nblue) {
    this._nblue = nblue
    this._embeddedControllers = new ConfigMap()
    this._configurableControllers = new ConfigMap()
  }

  get NBlue () {
    return this._nblue
  }

  get EmbeddedControllers () {
    return this._embeddedControllers
  }

  get ConfigurableControllers () {
    return this._configurableControllers
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

  parseConfigs (values) {
    // const that = this
    const configMaps = this.ConfigurableControllers

    // get base folder from config file or use current directory
    const base = this.NBlue.getBaseFolder()

    const parseFunc = (val) => {
      if (!val) throw new ReferenceError('val')

      // parse controller object
      if (typeof val === 'object') return aq.then(val)
      else if (typeof val === 'string') {
        // parse controller by config file
        // get full name of controller file
        const controllerFile = `${base}/${val}`

        // parse it to an object
        return ConfigMap.parseConfig(controllerFile)
      }

      throw new TypeError('val')
    }

    return aq.
      parallel(values.map((val) => parseFunc(val))).
      then((configs) => configs.
            filter((config) => config instanceof Map).
            forEach((config) => {
              const settings = config.Settings

              config.
                getArray(CONFIG_KEY_OF_CONTROLLERS).
                forEach(
                  (section) => {
                    // get name of controller from config section
                    const name = section.get(CONFIG_KEY_OF_ROUTER_NAME)

                    if (!section.has(CONFIG_KEY_OF_SETTINGS)) {
                      section.set(CONFIG_KEY_OF_SETTINGS, new Map())
                    }

                    const sectionSettings = section.get(CONFIG_KEY_OF_SETTINGS)

                    for (const [key, val] of settings) {
                      if (!sectionSettings.has(key)) {
                        sectionSettings.set(key, val)
                      }
                    }

                    // save setion to cache
                    configMaps.set(name, section)
                  }
                )
            })
        )
  }

  registerController (name, controllerConfig) {
    // register config of new controller to parsed map
    this.EmbeddedControllers.set(name, controllerConfig)
  }

  getControllerConfigs () {
    // create new map of controllers config
    const result = new ConfigMap()

    // create an array of controllers list
    const controllersList = [
      this.EmbeddedControllers,
      this.ConfigurableControllers
    ]

    // get config map of controllers
    for (const item of controllersList) {
      for (const [name, section] of item) {
        // create new map for config section
        const config = new ConfigMap()

        // merge section from config
        config.merge(section)

        // add config section to result by name
        result.set(name, config)
      }
    }

    // return contorllers' config
    return result
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

        // get target class of Controller by config
        const target = controllerConfigMap.has(CONFIG_KEY_OF_ROUTER_TARGET)
          ? controllerConfigMap.get(CONFIG_KEY_OF_ROUTER_TARGET)
          : null

        // get source file from router config map
        const srcFile = controllerConfigMap.has(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
          ? controllerConfigMap.get(CONFIG_KEY_OF_ROUTER_SOURCEFILE)
          : null

        // set merged settings to router config
        controllerConfigMap.set(Constants.KeyOfSettings, controllerSettings)

        // get class of Controller
        const Controller = target && srcFile === null
          ? target
          : this.getController(name, srcFile)

        // create new instance of router adapter by config map
        const controller = new Controller(nblue, controllerConfigMap)

        // bind controller to router in config map
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
