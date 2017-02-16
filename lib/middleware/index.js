
class ApplicationManager {

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

    // get name of application
    const appName = name.toLowerCase()

    // create new instance of application if can't find it in cache
    if (!cache.has(appName)) {
      // get Class of application by name
      const App = this.createApplication(name)

      // create new instance of application
      const app = new App(this.NApp)

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

  createApplication (name) {
    switch (name.toLowerCase()) {
    case 'logger':
    case 'nblue-logger':
      return require('./app-logger')
    case 'static':
    case 'nblue-static':
      return require('./app-static')
    case 'scope':
    case 'nblue-scope':
      return require('./app-scope')
    case 'session':
    case 'nblue-session':
      return require('./app-session')
    case 'json':
    case 'nblue-json':
      return require('./app-json')
    case 'form':
    case 'nblue-form':
      return require('./app-form')
    case 'data':
    case 'nblue-data':
      return require('./app-data')
    case 'hello':
    case 'nblue-hello':
      return require('./app-hello')
    default:
      try {
        return require(name)
      } catch (err) {
        return null
      }
    }
  }

}

module.exports = ApplicationManager
