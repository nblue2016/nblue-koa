schemas({
  $database: {
    default: 'oauth'
  },
  token: {
    model: {
      id: String,
      accessToken: String,
      accessTokenExpiresAt: Date,
      refreshToken: String,
      refreshTokenExpiresAt: Date,
      scope: String,
      clientId: String,
      userId: String
    },
    options: {
      collection: 'token'
    }
  }
})
