const querystring = require('querystring')

class ComponentManager {

  constructor (nblue) {
    this._nblue = nblue
    this._cache = new Map()
  }

  get NBlue () {
    return this._nblue
  }

  get Cache () {
    return this._cache
  }

  getLogger () {
    return this.NBlue.getLogger()
  }

  getComponent (name, options) {
    const opts = options || {}

    // check arguments
    if (!name) throw new ReferenceError('empty application name')

    // get instance of cache
    const cache = this.Cache

    let componentName = null

    if (typeof name === 'string') {
      // check the name has arguments or not
      const index = name.indexOf('?')

      // if the name has arguments, try to parse it
      if (index >= 0) {
        // get componentName from name string
        componentName = name.toLowerCase().substring(0, index)

        // parse options from name string
        Object.assign(
          opts,
          querystring.parse(name.substring(index + 1, name.length))
        )
      } else {
        // use name as default component name
        componentName = name.toLowerCase()
      }
    } else if (typeof name === 'object') {
      // get name from section if it is a Map
      componentName = name.has('name') ? name.get('name') : 'unknown'

      if (name.has('options')) {
        Object.assign(opts, name.get('options').toObject())
      }

      if (name.has('src')) opts.src = name.get('src')
      if (name.has('config')) opts.config = name.get('config')
    }

    // create new instance of application if can't find it in cache
    if (!cache.has(componentName) || opts.new === true) {
      // get Class of application by name
      const Component = this.createComponent(componentName, opts)

      // create new instance of application
      const component = new Component(this.NBlue, opts)

      // throw error if create application failed
      if (!component) {
        throw new ReferenceError(`Doesn't support application by name: ${name}`)
      }

      // return new instance of component without putting to cache
      if (opts.new === true) return component

      // save instance of application to cache
      cache.set(componentName, component)
    }

    // get instance of applicatin from cache by name
    return cache.get(componentName)
  }

  createComponent (name, options) {
    // assign options to opts
    const opts = options || {}

    // declare class of component
    let componentClass = null

    try {
      // load component from source file if file exists
      if (opts.src) {
        // get base folder
        const base = this.NBlue.getBaseFolder()

        // create class by path
        componentClass = require(`${base}//${opts.src}`)
      } else {
        // get pre-definition component class by name
        switch (name.toLowerCase()) {
        case 'hello':
          componentClass = require('./hello')
          break
        case 'static':
          componentClass = require('./static')
          break
        case 'json':
          componentClass = require('./json')
          break
        case 'form':
          componentClass = require('./form')
          break
        case 'logger':
          componentClass = require('./logger')
          break
        case 'cache':
          componentClass = require('./cache')
          break
        case 'data':
          componentClass = require('./data')
          break
        case 'session':
          // use memory session or redis session with options
          if (opts.redis === true || opts.redis === 'true') {
            componentClass = require('./session-redis')
          } else {
            componentClass = require('./session')
          }
          break
        case 'scope':
          componentClass = require('./scope')
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
