class SuperApp {

  constructor (nkoa) {
    this._nkoa = nkoa
  }

  get Nkoa () {
    return this._nkoa
  }

  get Application () {
    return this.Nkoa.Application
  }

  get Context () {
    return this.Application.Context
  }

  get Config () {
    return this.Nkoa.Config
  }

  get Settings () {
    return this.Config.Settings
  }

  get Logger () {
    return this.Nkoa.Logger
  }

  get Schemas () {
    return this.Nkoa.Schemas
  }

}

module.exports = SuperApp
