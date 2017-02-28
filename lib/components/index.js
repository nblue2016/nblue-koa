class ComponentManager {

  constructor (napp) {
    this._napp = napp
    this._cache = new Map()
  }

  get NApp () {
    return this._napp
  }

  get Cache () {
    return this._cache
  }

  getLogger () {
    return this.NApp.getLogger()
  }

  getComponent (name) {
    // check arguments
    if (!name) throw new ReferenceError('empty application name')

    // get instance of cache
    const cache = this.Cache

    let
      componentName = null,
      opts = {},
      src = null

    if (typeof name === 'string') {
      componentName = name.toLowerCase()
    } else if (name instanceof Map) {
      componentName = name.has('name') ? name.get('name') : 'unknown'

      if (name.has('src')) src = name.get('src')
      if (name.has('options')) {
        opts = name.get('options').toObject()
      }
    }

    // create new instance of application if can't find it in cache
    if (!cache.has(componentName)) {
      // get Class of application by name
      const Component = this.createComponent(componentName, src)

      // create new instance of application
      const component = new Component(this.NApp, opts)

      // throw error if create application failed
      if (!component) {
        throw new ReferenceError(`Doesn't support application by name: ${name}`)
      }

      // save instance of application to cache
      cache.set(componentName, component)
    }

    // get instance of applicatin from cache by name
    return cache.get(componentName)
  }

  createComponent (name, componentFile) {
    // declare class of component
    let componentClass = null

    try {
      // load component from source file if file exists
      if (componentFile) {
        // get base folder
        const base = this.NApp.getBaseFolder()

        // create class by path
        componentClass = require(`${base}//${componentFile}`)
      } else {
        // get pre-definition component class by name
        switch (name.toLowerCase()) {
        case 'logger':
        case 'nblue-logger':
          componentClass = require('./logger')
          break
        case 'data':
        case 'nblue-data':
          componentClass = require('./data')
          break
        case 'static':
        case 'nblue-static':
          componentClass = require('./static')
          break
        case 'scope':
        case 'nblue-scope':
          componentClass = require('./scope')
          break
        case 'session':
        case 'nblue-session':
          componentClass = require('./session')
          break
        case 'json':
        case 'nblue-json':
          componentClass = require('./json')
          break
        case 'form':
          componentClass = require('./form')
          break
        case 'hello':
          componentClass = require('./hello')
          break
        default:
          componentClass = require(name)
          break
        }
      }

      // get instance of logger
      const logger = this.getLogger()

      // append created info to logger
      if (logger) {
        logger.verbose(`get component class for ${name} ok.`)
      }

      // return class of component
      return componentClass
    } catch (err) {
      // get instance of logger
      const logger = this.getLogger()

      // append error to logger if created failed
      if (logger) {
        logger.error(`created component (${name}) failed.`, err)
      }

      // return null, current component will be ignored
      return null
    }
  }

}

module.exports = ComponentManager
