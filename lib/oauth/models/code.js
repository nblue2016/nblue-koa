schemas({
  $database: {
    default: 'oauth'
  },
  code: {
    model: {
      code: String,
      expiresAt: Date,
      redirectUri: String,
      scope: String,
      clientid: String,
      userid: String
    },
    options: {
      collection: 'code'
    }
  }
})
