schemas({
  $database: {
    default: 'oauth'
  },
  token: {
    model: {
      id: String,
      code: String,
      expiresAt: Date,
      redirectUri: [String],
      scope: String,
      clientId: String,
      userId: String
    },
    options: {
      collection: 'token'
    }
  }
})
