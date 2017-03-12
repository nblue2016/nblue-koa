const Constants = require('.././constants')

class Component {

  constructor (nblue) {
    // set instance of nblue application
    this._nblue = nblue

    // init variants
    this._name = 'base'
  }

  get Name () {
    return this._name
  }
  set Name (val) {
    this._name = val
  }

  get NBlue () {
    return this._nblue
  }

  // gets instance of application manager
  get ComponentManager () {
    return this.NBlue.ComponentManager
  }

  get ServerType () {
    return this.NBlue.ServerType
  }

  // gets instance of web application with alias
  get WebApplication () {
    return this.NBlue.Application
  }

  // gets instance of web config
  get WebConfig () {
    return this.NBlue.Config
  }

  // gets instance of web settings
  get WebSettings () {
    return this.WebConfig.Settings
  }

  // gets instance of logger
  get Logger () {
    return this.NBlue.Logger
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
    return this.NBlue.getLogger(moduleName)
  }

  createEmptyMW () {
    switch (this.ServerType) {
    case Constants.ServerOfExpress:
      return (req, res, next) => next()
    case Constants.ServerOfKoa2:
      return (ctx, next) => next()
    case Constants.ServerOfKoa:
    default:
      return function *(next) {
        return yield next
      }
    }
  }

  respond (... args) {
    // get instance of nblue application
    const nblue = this.NBlue

    // call respond from application
    return nblue.respond(... args)
  }

}

module.exports = Component
