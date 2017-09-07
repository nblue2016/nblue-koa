const path = require('path')
const querystring = require('querystring')

class ComponentManager {

  constructor (nblue) {
    this._nblue = nblue
    this._cache = new Map()
    this._uidCache = new Map()
    this._startupOpts = new Map()
  }

  get NBlue () {
    return this._nblue
  }

  get Cache () {
    return this._cache
  }

  get UidCache () {
    return this._uidCache
  }

  get StartupOptions () {
    return this._startupOpts
  }

  getLogger () {
    return this.NBlue.getLogger()
  }

  // the method gets a component by name with options
  // this method will create component by automatically
  // if it has been created before
  getComponentByName (name, options) {
    // check for arguments
    if (!name) throw ReferenceError('name')

    // assign options to opts
    const opts = options || {}

    // declare component name
    let componentName = name

    // if the name has arguments like name?arg1=val&arg2=val2
    // try to use querystring to parse and assign to options
    if (name.indexOf('?') >= 0) {
      // check the name has arguments or not
      const index = name.indexOf('?')

      // get componentName from name string
      componentName = name.toLowerCase().substring(0, index)

      // parse options from name string
      Object.assign(
        opts,
        querystring.parse(name.substring(index + 1, name.length))
      )
    }

    // get instance of nblue application
    const nblue = this.NBlue

    // get instance of components cache
    const cache = this.Cache

    // get instance of components cache
    const uidCache = this.UidCache

    // create new instance of application if can't find it in cache
    if (!cache.has(componentName) || opts.new === true) {
      // get Class of application by name
      const Component = this.createComponent(componentName, opts)

      // create new instance of application
      const component = new Component(nblue, opts)

      // throw error if create application failed
      if (!component) {
        throw new ReferenceError(
          `Doesn't support application by name: ${componentName}`
        )
      }

      // save component to cache by uid
      uidCache.set(component.Uid, component)

      // return new instance of component without putting to cache
      if (opts.new === true) return component

      // save instance of application to cache
      cache.set(componentName, component)
    }

    // get instance of applicatin from cache by name
    return cache.get(componentName)
  }

  // the method gets a component by uid, the same component
  // has many instance, the instances have different uid
  getComponentByUid (uid) {
    // check for arguments
    if (!uid) throw new ReferenceError('uid')

    // get instance of components cache
    const uidCache = this.UidCache

    // returns component if found it by uid
    if (uidCache.has(uid)) return uidCache.get(uid)

    // throw error if desn't find it
    throw new Error(`can't find component by uid: ${uid}`)
  }

  createComponent (name, options) {
    // assign options to opts
    const opts = options || {}

    // set component name from config
    if (!opts.name) opts.name = name

    // declare class of component
    let componentClass = null

    try {
      // load component from source file if file exists
      if (opts.src) {
        // create class by path
        // componentClass = require(`${baseFolder}//${opts.src}`)
        const rt = this.createComponentBySrc(opts.src)

        // get component class and assign dirname to opts
        if (rt) {
          opts.dirname = rt.dirname
          componentClass = rt.class
        }
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

  createComponentBySrc (sourceFile) {
    // check for arguments
    if (!sourceFile) throw new ReferenceError('sourceFile')

    // get instance of nblue application
    const nblue = this.NBlue

    // get base folder from nblue application
    const baseFolder = nblue.getBaseFolder()

    // create array of impossible component source files
    const srcs = [
      sourceFile,
      `${baseFolder}/${sourceFile}`
    ]

    // fetch all item in srouce files
    for (const src of srcs) {
      try {
        // try to call require to get a module
        const componentClass = require(src)

        // return class if it was found
        if (componentClass) {
          // get directory name for current component
          const dirname = path.dirname(src)

          // return dirname and class of component
          return {
            dirname,
            class: componentClass
          }
        }
      } catch (err) {
        continue
      }
    }

    // return null if get component by source file failed
    return null
  }

}

module.exports = ComponentManager
