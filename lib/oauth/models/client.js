schemas({
  $database: {
    default: 'oauth'
  },
  client: {
    model: {
      id: String,
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
