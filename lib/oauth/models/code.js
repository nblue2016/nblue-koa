schemas({
  $database: {
    default: 'oauth'
  },
  code: {
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
      collection: 'code'
    }
  }
})
