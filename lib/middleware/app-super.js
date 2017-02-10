class SuperApp {

  constructor (napp) {
    // set instance of nblue application
    this._napp = napp
  }

  get NApp () {
    return this._napp
  }

  // gets instance of web application
  get Application () {
    return this.NApp.Application
  }

  // gets instance of application manager
  get ApplicationManager () {
    return this.NApp.ApplicationManager
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

  getAppByName (name) {
    const amgr = this.ApplicationManager

    return amgr.getApplication(name)
  }

}

module.exports = SuperApp
