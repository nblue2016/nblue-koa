const Context = require('.././context')

class SuperApp {

  constructor (nkoa) {
    this._nkoa = nkoa
  }

  get Nkoa () {
    return this._nkoa
  }

  get App () {
    return this.Nkoa.App
  }

  get Context () {
    return this.App.Context
  }

  getConfig (ctx) {
    return Context.getConfig(ctx || this.Context)
  }

  getLogger (ctx) {
    return Context.getLogger(ctx || this.Context)
  }

}

module.exports = SuperApp
