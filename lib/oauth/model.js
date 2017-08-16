class Model {

  generateAccessToken (client, user, scope) {
    return scope
  }

  generateRefreshToken (client, user, scope) {
    return scope
  }

  generateAuthorizationCode (client, user, scope) {
    return scope
  }

  getAccessToken (accessToken) {
    return accessToken
  }

  getRefreshToken (refreshToken) {
    return refreshToken
  }

  getAuthorizationCode (authorizationCode) {
    return authorizationCode
  }

  getClient (clientId, clientSecret) {
    return clientSecret
  }

  getUser (username, password) {
    return password
  }

  getUserFromClient (client) {
    return client
  }

  saveToken (token, client, user) {
    return user
  }

  saveAuthorizationCode (code, client, user) {
    return user
  }

  revokeToken (token) {
    return token
  }

  revokeAuthorizationCode (code) {
    return code
  }

  validateScope (user, client, scope) {
    return scope
  }

  verifyScope (accessToken, scope) {
    return scope
  }

}

module.exports = Model
