class Component {

  constructor (napp) {
    // set instance of nblue application
    this._napp = napp

    // init variants
    this._name = 'base'
  }

  get Name () {
    return this._name
  }
  set Name (val) {
    this._name = val
  }

  get NApp () {
    return this._napp
  }

  // gets instance of web application
  get Application () {
    return this.NApp.Application
  }

  // gets instance of application manager
  get ComponentManager () {
    return this.NApp.ComponentManager
  }

  get ServerType () {
    return this.NApp.ServerType
  }

  // gets instance of web application with alias
  get WebApplication () {
    return this.NApp.Application
  }

  // gets instance of web config
  get WebConfig () {
    return this.NApp.Config
  }

  // gets instance of web settings
  get WebSettings () {
    return this.WebConfig.Settings
  }

  // gets instance of logger
  get Logger () {
    return this.NApp.Logger
  }

  getComponentByName (name) {
    // get instance of application manager
    const comgr = this.ComponentManager

    // get application by name
    return comgr.getComponent(name)
  }

  getLogger (name) {
    // set module name for logger
    const moduleName = `component_${name || this.Name}`

    // return instance of logger by module name
    return this.NApp.getLogger(moduleName)
  }

  createEmptyMW () {
    switch (this.ServerType) {
    case 'express':
      return (req, res, next) => next()
    case 'koa':
    default:
      return function *(next) {
        return yield next
      }
    }
  }

}

module.exports = Component
