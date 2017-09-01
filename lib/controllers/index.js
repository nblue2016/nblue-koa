// reference libraries
const path = require('path')
const core = require('nblue-core')

// use classess
const aq = core.aq
const co = core.co
const ConfigMap = core.ConfigMap

// define constant
const CONFIG_KEY_OF_CONTROLLERS = 'controllers'

const CONFIG_KEY_OF_SETTINGS = 'settings'
const CONFIG_KEY_OF_CONTROLLER_NAME = 'name'
const CONFIG_KEY_OF_CONTROLLER_SOURCEFILE = 'src'

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

  get NConfig () {
    return this.NBlue.Config
  }

  get NSettings () {
    return this.NConfig ? this.NConfig.Settings : null
  }

  getLogger () {
    return this.NBlue.getLogger()
  }

  parseControllersConfig (values) {
    // const that = this
    const controllersCache = this.ConfigurableControllers

    // get base folder from config file or use current directory
    const base = this.NBlue.getBaseFolder()

    // define a function to parse controllers config section
    // we can define one or more controller section or config file name here
    const parseFunc = (val) => {
      // check for arguments
      if (!val) throw new ReferenceError('val')

      // parse controller object
      if (typeof val === 'object') {
        // create new map for controller config section
        const controllers = new ConfigMap()

        // convert a section to array and save to map
        controllers.set(CONFIG_KEY_OF_CONTROLLERS, [val])

        // return controllers
        return aq.then(controllers)
      } else if (typeof val === 'string') {
        // parse controller by config file
        // get full name of controller file and parse it
        return ConfigMap.parseConfig(`${base}/${val}`)
      }

      // throw error if value is invalid type
      throw new TypeError('val')
    }

    return aq.
      parallel(values.map((val) => parseFunc(val))).
      then((configs) => configs.
            forEach((config) => {
              // get settings from config for all controllers in one config
              const settings = config.Settings

              // fetch every config section of controller
              config.
                getArray(CONFIG_KEY_OF_CONTROLLERS).
                forEach(
                  (section) => {
                    // get name of controller from config section
                    const name = section.get(CONFIG_KEY_OF_CONTROLLER_NAME)

                    // create new config map for contorller config section
                    const newSection = new ConfigMap()

                    // copy values from original config section
                    newSection.merge(section)

                    // append settings to new secion
                    if (!newSection.has(CONFIG_KEY_OF_SETTINGS)) {
                      newSection.set(CONFIG_KEY_OF_SETTINGS, new Map())
                    }

                    // get settings from new section
                    const newSettings =
                      newSection.get(CONFIG_KEY_OF_SETTINGS)

                    // copy value to every controller from controllers setings
                    for (const [key, val] of settings) {
                      if (!newSettings.has(key)) {
                        newSettings.set(key, val)
                      }
                    }

                    // save setion to cache
                    controllersCache.set(name, newSection)
                  }
                )
            })
        )
  }

  registerController (name, config) {
    // check for arguments
    if (!name) throw new ReferenceError('name')
    if (!config) throw new ReferenceError('config')

    // register config of new controller to parsed map
    this.EmbeddedControllers.set(name, config)
  }

  getControllersConfig () {
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
        // add config section to result by name
        result.set(name, section)
      }
    }

    // return contorllers' config
    return result
  }

  createControllerByConfig (config) {
    // check for arguments
    if (!config) throw new ReferenceError('config')

    // get instance of nblue application
    const nblue = this.NBlue

    // get instance of logger
    const logger = this.getLogger()

    // create generator function to get instance of controller
    const gen = function *() {
      try {
        // get class of Controller
        const Controller = this.getControllerByConfig(config)

        // create new instance of router adapter by config map
        const controller = new Controller(nblue, config)

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

  getControllerByConfig (config) {
    // check for arguments
    if (!config) throw new Error(`Null reference of controller config`)

    // get instance of logger
    const logger = this.getLogger()

    // define function to getting a value function with default
    const getValue = function (key, defaultVal) {
      return config.has(key) ? config.get(key) : defaultVal
    }

    // get instance of nblue application
    const nblue = this.NBlue

    // get the name of contorler
    const name = getValue(CONFIG_KEY_OF_CONTROLLER_NAME, null)

    // get source file of controller by config
    const srcFile = getValue(CONFIG_KEY_OF_CONTROLLER_SOURCEFILE, null)

    // declare
    let controllerClass = null

    try {
      // parse controller by file
      if (srcFile) {
        try {
          controllerClass = require(srcFile)
        } catch (err) {
          // get base folder from settings
          const base = nblue.getBaseFolder(this.NSettings)

          // get controller class by full path
          controllerClass = require(path.join(base, srcFile))
        }
      } else {
        // try to get inner-controller by name
        switch (name.toLowerCase()) {
        case 'models':
        case 'rest':
          controllerClass = require('./models')
          break
        case 'script':
          controllerClass = require('./script')
          break
        case 'scope':
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
