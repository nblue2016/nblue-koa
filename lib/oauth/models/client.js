schemas({
  $database: {
    default: 'oauth'
  },
  client: {
    model: {
      clientId: String,
      secret: String,
      description: String,
      redirectUris: [String],
      grants: [String],
      scopes: [String],
      accessTokenLifetime: Number,
      refreshTokenLifetime: Number,
      createdDate: Date,
      createdBy: String
    },
    options: {
      collection: 'client'
    }
  }
})
