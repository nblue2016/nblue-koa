schemas({
  $database: {
    default: 'oauth'
  },
  client: {
    model: {
      clientId: String,
      secret: String,
      redirectUris: [String],
      grants: [String],
      accessTokenLifetime: Number,
      refreshTokenLifetime: Number
    },
    options: {
      collection: 'client'
    }
  }
})
