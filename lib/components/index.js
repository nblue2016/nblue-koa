
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

  getApplication (name) {
    // check arguments
    if (!name) throw new ReferenceError('empty application name')

    // get instance of cache
    const cache = this.Cache

    let
      appName = null,
      opts = {},
      src = null

    if (typeof name === 'string') {
      appName = name.toLowerCase()
    } else if (name instanceof Map) {
      // console.log(name.toObject())
      const keys = Object.keys(name.toObject())

      appName = keys[0]

      if (name.has('src')) src = name.get('src')
      if (name.has('options')) {
        opts = name.get('options').toObject()
      }
    }

    // get name of application
    // const appName = name.toLowerCase()

    // create new instance of application if can't find it in cache
    if (!cache.has(appName)) {
      // get Class of application by name
      const App = this.createApplication(name, src)

      // create new instance of application
      const app = new App(this.NApp, opts)

      // throw error if create application failed
      if (!app) {
        throw new ReferenceError(`Doesn't support application by name: ${name}`)
      }

      // save instance of application to cache
      cache.set(appName, app)
    }

    // get instance of applicatin from cache by name
    return cache.get(appName)
  }

  createApplication (name, componentFile) {
    const logger = this.NApp.getLogger()

    let componentClass = null

    try {
      if (componentFile) {
        // get base folder
        const base = this.NApp.getBaseFolder()

        // create class by path
        componentClass = require(`${base}//${componentFile}`)
      } else {
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

      if (logger) {
        logger.verbose(`created component (${name}) ok.`)
      }

      return componentClass
    } catch (err) {
      if (logger) {
        logger.error(`created component (${name}) failed.`, err)
      }

      return null
    }
  }

}

module.exports = ComponentManager
