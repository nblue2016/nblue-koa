
class ApplicationManager
{

  constructor (nkoa) {
    this._nkoa = nkoa
    this._cache = new Map()
  }

  get Nkoa () {
    return this._nkoa
  }

  get Cache () {
    return this._cache
  }

  getMiddleware (name) {
    if (!name) throw new Error('empty middleware name')

    const app = this.getApplication(name)

    return typeof app.koa === 'function' ? app.koa() : app
  }

  getApplication (name) {
    if (!name) throw new Error('empty application name')

    const cache = this.Cache
    const appName = name.toLowerCase()

    if (!cache.has(appName)) {
      const App = this.createApplication(name)
      const app = new App(this.Nkoa)

      if (!app) {
        throw new Error(`Doesn't support application by name: ${name}`)
      }

      cache.set(appName, app)
    }

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
