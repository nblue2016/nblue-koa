// reference libraries
const core = require('nblue-core')

// get class of nblue core
// const aq = core.aq
const betch = core.betch
const IIf = core.IIf
const UUID = core.UUID
const C = console

// const CollectionOfUser = 'user'

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
    const mapFunc = this.mapObject.bind(this)

    return this.execute(
      target, 'retrieve', filter, { method: 'findOne' }
    ).
    then((data) =>
      IIf(data, () => mapFunc(target, data.toObject()), null)
    )
  }

  execute (target, method, ... args) {
    // get instance of data component
    const dc = this.DataComponent

    const func = method || 'retrieve'

    return dc.pexecute(target, (adapter) => adapter[func](... args))
  }

  mapObject (target, obj) {
    switch (target.toLowerCase()) {
    case 'client': {
      // rename clientId to id
      obj.id = obj.clientId
      Reflect.deleteProperty(obj, 'clientId')

      return obj
    }
    case 'user': {
      // rename userId to id
      obj.id = obj.userId
      Reflect.deleteProperty(obj, 'userId')

      return obj
    }
    default:
      return obj
    }
  }

  nothing () {
    return
  }

  generateAccessToken (client, user, scope) {
    if (scope) this.nothing()

    C.log('## step: generateAccessToken')

    return UUID.generate('v4')
  }

  generateRefreshToken (client, user, scope) {
    if (scope) this.nothing()

    C.log('## step: generateRefreshToken')

    return UUID.generate('v4')
  }

  generateAuthorizationCode (client, user, scope) {
    if (scope) this.nothing()

    C.log('## step: generateAuthorizationCode')

    return UUID.generate('v4')
  }

  getAccessToken (accessToken) {
    C.log('## step: getAccessToken')

    // create new object for context
    const ctx = { $fullReturn: true }

    // define function to find one object by orm
    const findOne = this.findOne.bind(this)

    // set filter
    const filter = { accessToken }

    // try to find token by refresh token
    return findOne('token', filter).
      then((data) => {
        // throw error if can't find token by refresh token
        if (!data) throw new Error('invalid refresh token')

        // return token
        return data
      }).
      then((data) => betch({
        token: data,
        client: findOne('client', { clientId: data.clientId }),
        user: findOne('user', { userId: data.userId })
      }, ctx)).
      then(() => {
        // get token, client and user from context
        const { token, client, user } = ctx

        // return target object
        return {
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          scope: token.scope,
          client: { id: client.id },
          user: { id: user.id }
        }
      })
  }

  getRefreshToken (refreshToken) {
    C.log('## step: getRefreshToken')

    // create new object for context
    const ctx = { $fullReturn: true }

    // define function to find one object by orm
    const findOne = this.findOne.bind(this)

    // set filter
    const filter = { refreshToken }

    // try to find token by refresh token
    return findOne('token', filter).
      then((data) => {
        // throw error if can't find token by refresh token
        if (!data) throw new Error('invalid refresh token')

        // return token
        return data
      }).
      then((data) => betch({
        token: data,
        client: findOne('client', { clientId: data.clientId }),
        user: findOne('user', { userId: data.userId })
      }, ctx)).
      then(() => {
        // get token, client and user from context
        const { token, client, user } = ctx

        // return target object
        return {
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt,
          scope: token.scope,
          client: { id: client.id },
          user: { id: user.id }
        }
      })
  }

  getAuthorizationCode (authorizationCode) {
    C.log('## step: getAuthorizationCode')

    const ctx = { $fullReturn: true }
    const findOne = this.findOne.bind(this)
    const filter = { code: authorizationCode }

    return findOne('code', filter).
      then((data) => {
        // throw error if can't find token by refresh token
        if (!data) throw new Error('invalid refresh token')

        // return token
        return data
      }).
      then((data) => betch({
        code: data,
        client: findOne('client', { clientId: data.clientId }),
        user: findOne('user', { userId: data.userId })
      }, ctx)).
      then(() => {
        // get code, client and user from context
        const { code, client, user } = ctx

        // return target object
        return {
          code: code.code,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: code.scope,
          client: { id: client.id },
          user: { id: user.id }
        }
      })
  }

  getClient (clientId, clientSecret) {
    C.log('## step: getClient')
    if (!clientId) throw new ReferenceError('clientId')

    const findOne = this.findOne.bind(this)
    const filter = {}

    filter.clientId = clientId
    if (clientSecret) filter.secret = clientSecret

    return findOne('client', filter)
  }

  getUser (username, password) {
    C.log('## step: getUser')
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

        return user
      })
  }

  getUserFromClient (client) {
    C.log('## step: getUserFromClient')

    return client
  }

  saveToken (token, client, user) {
    C.log('## step: saveToken')

    const exec = this.execute.bind(this)

    const newToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      clientId: client ? client.id : '',
      userId: user ? user.id : ''
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
    C.log('## step: saveAuthorizationCode')

    return user
  }

  revokeToken (token) {
    C.log('## step: revokeToken')

    return token
  }

  revokeAuthorizationCode (code) {
    C.log('## step: revokeAuthorizationCode')

    return code
  }

  validateScope (user, client, scope) {
    C.log('## step: validateScope')

    if (scope) this.nothing()

    return 'scopeR'
  }

  verifyScope (accessToken, scope) {
    C.log('## step: verifyScope')

    return scope
  }

}

module.exports = Model
