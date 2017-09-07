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

  get N () {
    return this._nblue
  }

  get Component () {
    return this._component
  }

  get DataComponent () {
    return this._dataComponent
  }

  getDb (name) {
    const dc = this.DataComponent
    const mapFunc = this.mapObject(name)

    return dc.getEntity(name, mapFunc)
  }

  getDbs (... targets) {
    const getDb = this.getDb.bind(this)

    const rt = {}

    for (const target of targets) {
      rt[target] = getDb(target)
    }

    return rt
  }

  mapObject (name) {
    switch (name.toLowerCase()) {
    case 'client': {
      return (obj) => {
        if (!obj) return null

        // rename clientId to id
        obj.id = obj.clientId
        Reflect.deleteProperty(obj, 'clientId')

        return obj
      }
    }
    case 'user': {
      return (obj) => {
        if (!obj) return null

        // rename userId to id
        obj.id = obj.userId
        Reflect.deleteProperty(obj, 'userId')

        return obj
      }
    }
    case 'token': {
      return (obj) => {
        if (!obj) return null

        // rename userId to id
        obj.client = { id: obj.clientId }
        obj.user = { id: obj.userId }

        // remove unused properties
        Reflect.deleteProperty(obj, 'clientId')
        Reflect.deleteProperty(obj, 'userId')

        return obj
      }
    }
    case 'code': {
      return (obj) => {
        if (!obj) return null

        // rename userId to id
        obj.authorizationCode = obj.code
        obj.client = { id: obj.clientId }
        obj.user = { id: obj.userId }

        // remove unused properties
        Reflect.deleteProperty(obj, 'code')
        Reflect.deleteProperty(obj, 'clientId')
        Reflect.deleteProperty(obj, 'userId')

        return obj
      }
    }
    default:
      return (obj) => obj
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

  generateAuthorizationCode2 (client, user, scope) {
    if (scope) this.nothing()

    C.log('## step: generateAuthorizationCode')
    const code = UUID.generate('v4')

    C.log(`code: ${code}`)

    return Promise.resolve(code)
  }

  getAccessToken (accessToken) {
    C.log('## step: getAccessToken')

    // get databases by name
    const dbs = this.getDbs('token', 'client', 'user')

    // create filter for matched access token
    const filter = { accessToken }

    // create new object for context
    const ctx = { $fullReturn: true }

    // try to find token by refresh token
    return dbs.token.findOne(filter).
      then((data) => {
        // throw error if can't find token by refresh token
        if (!data) throw new Error('invalid access token')

        // return token
        return data
      }).
      then((data) => betch({
        token: data,
        client: dbs.client.findOne({ clientId: data.client.id }),
        user: dbs.user.findOne({ userId: data.user.id })
      }, ctx)).
      then((data) => {
        // get token, client and user from context
        const { token, client, user } = data

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

    // get databases by name
    const dbs = this.getDbs('token', 'client', 'user')

    // create new object for context
    const ctx = { $fullReturn: true }

    // create filter for matched refresh token
    const filter = { refreshToken }

    // try to find token by refresh token
    return dbs.token.findOne(filter).
      then((data) => {
        // throw error if can't find token by refresh token
        if (!data) throw new Error('invalid refresh token')

        // return token
        return data
      }).
      then((data) => betch({
        token: data,
        client: dbs.client.findOne({ clientId: data.client.id }),
        user: dbs.user.findOne({ userId: data.user.id })
      }, ctx)).
      then((data) => {
        // get token, client and user from context
        const { token, client, user } = data

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

    // get databases by name
    const dbs = this.getDbs('code', 'client', 'user')

    // create filter for matched authorization code
    const filter = { code: authorizationCode }

    // create context for betch
    const ctx = { $fullReturn: true }

    // find matched code by filter
    return dbs.code.findOne(filter).
      then((data) => {
        // throw error if can't find code by authorization code
        if (!data) throw new Error('invalid authorization code')

        // return token
        return data
      }).
      then((data) => betch({
        code: data,
        client: dbs.client.findOne({ clientId: data.client.id }),
        user: dbs.user.findOne({ userId: data.user.id })
      }, ctx)).
      then((data) => {
        // get code, client and user from context
        const { code, client, user } = data

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

    // get database by name
    const db = this.getDb('client')

    // create filter for matched client
    const filter = {}

    filter.clientId = clientId
    if (clientSecret) filter.secret = clientSecret

    // find client from db by filter
    return db.findOne(filter)
  }

  getUser (username, password) {
    C.log('## step: getUser')

    // get database by name
    const db = this.getDb('user')

    // create filter for matched user
    const filter = { name: username }

    // find user from db by filter
    return db.findOne(filter).
      then((user) => {
        if (user === null) {
          throw new Error(`Cannot find use by name: ${username}`)
        }

        // verify password
        if (user.password !== password) {
          throw new Error('invalid password!')
        }

        // reutrn instance of user
        return user
      })
  }

  getUserFromClient (client) {
    C.log('## step: getUserFromClient')

    if (!client) return { id: null }

    // get database by name
    const db = this.getDb('user')

    // create filter for matched user
    const filter = { clientId: client.id }

    // find user from db by filter
    return db.findOne(filter).
      then((user) => IIf(user, () => user, { id: null }))
  }

  saveToken (token, client, user) {
    C.log('## step: saveToken')

    // get database by name
    const db = this.getDb('token')

    // create body of new token that will be saved into database
    const newToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      clientId: client ? client.id : '',
      userId: user ? user.id : ''
    }

    // save new token to database
    return db.create(newToken)
  }

  saveAuthorizationCode (code, client, user) {
    C.log('## step: saveAuthorizationCode')

    // get database by name
    const db = this.getDb('code')

    // create body of new code that will be saved into database
    const newCode = {
      code: code.authorizationCode,
      expiresAt: code.expiresAt,
      redirectUri: code.redirectUri,
      scope: code.scope,
      clientId: client ? client.id : '',
      userId: user ? user.id : ''
    }

    // save new token to database
    return db.create(newCode)
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
