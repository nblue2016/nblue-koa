// reference libraries
const core = require('nblue-core')

// get class of nblue core
// const aq = core.aq
const betch = core.betch
const UUID = core.UUID
const C = console

class Model {

  constructor (component) {
    // check for arguments
    if (component === null) throw new ReferenceError('component')

    // initialize variants
    this._component = component
    this._dataComponent = component.DataComponent
    this._nblue = component.NBlue
  }

  get NBlue () {
    return this._nblue
  }

  get Component () {
    return this._component
  }

  get DataComponent () {
    return this._dataComponent
  }

  findOne (target, filter) {
    return this.execute(target, 'retrieve', filter, { method: 'findOne' })
  }

  execute (target, method, ... args) {
    // get instance of data component
    const dc = this.DataComponent

    const func = method || 'retrieve'

    return dc.pexecute(target, (adapter) => adapter[func](... args))
  }

  nothing () {
    return
  }

  generateAccessToken (client, user, scope) {
    if (scope) this.nothing()

    C.log('## generateAccessToken')

    return UUID.generate('v4')
  }

  generateRefreshToken (client, user, scope) {
    if (scope) this.nothing()

    C.log('## generateRefreshToken')

    return UUID.generate('v4')
  }

  generateAuthorizationCode (client, user, scope) {
    if (scope) this.nothing()

    C.log('## generateAuthorizationCode')

    return UUID.generate('v4')
  }

  getAccessToken (accessToken) {
    C.log('## getAccessToken')

    const ctx = { $fullResult: true }
    const findOne = this.findOne.bind(this)

    return betch({
      token: findOne('token', { accessToken }),
      client: (ct) => findOne('client', { clientId: ct.token.clientId }),
      user: (ct) => findOne('user', { userId: ct.token.userId })
    }, ctx).
    then((data) => {
      const token = data.token
      const client = data.client
      const user = data.user

      return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        scope: token.scope,
        client: { id: client.clientId },
        user: { id: user.userId }
      }
    })
  }

  getRefreshToken (refreshToken) {
    C.log('## getRefreshToken')

    return refreshToken
  }

  getAuthorizationCode (authorizationCode) {
    C.log('## getAuthorizationCode')

    return authorizationCode
  }

  getClient (clientId, clientSecret) {
    C.log('## getClient')

    const findOne = this.findOne.bind(this)

    return findOne(
      'client', {
        clientid: clientId,
        secret: clientSecret
      })
  }

  getUser (username, password) {
    C.log('## getUser')
    // get find function with current
    const findOne = this.findOne.bind(this)

    return findOne('user', { name: username }).
      then((data) => {
        // get instance of user from database
        const user = data

        if (user === null) {
          throw new Error(`Cannot find use by name: ${username}`)
        }

        if (user.password !== password) {
          throw new Error('invalid password!')
        }

        return user.toObject()
      })
  }

  getUserFromClient (client) {
    C.log('## getUserFromClient')

    return client
  }

  saveToken (token, client, user) {
    C.log('## saveToken')

    const exec = this.execute.bind(this)

    const newToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      clientId: client ? client.clientid : '',
      userId: user ? user.userId : ''
    }

    return exec('token', 'create', newToken).
      then((data) => {
        const savedToken = data

        return {
          accessToken: savedToken.accessToken,
          accessTokenExpiresAt: savedToken.accessTokenExpiresAt,
          refreshToken: savedToken.refreshToken,
          refreshTokenExpiresAt: savedToken.refreshTokenExpiresAt,
          scope: savedToken.scope,
          client: {
            id: savedToken.clientId
          },
          user
        }
      })
  }

  saveAuthorizationCode (code, client, user) {
    C.log('## saveAuthorizationCode')

    return user
  }

  revokeToken (token) {
    C.log('## revokeToken')

    return token
  }

  revokeAuthorizationCode (code) {
    C.log('## revokeAuthorizationCode')

    return code
  }

  validateScope (user, client, scope) {
    C.log('## validateScope')

    if (scope) this.nothing()

    return 'scopeR'
  }

  verifyScope (accessToken, scope) {
    C.log('## verifyScope')

    return scope
  }

}

module.exports = Model
