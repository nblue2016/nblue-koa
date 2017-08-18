schemas({
  $database: {
    default: 'oauth'
  },
  user: {
    model: {
      userId: String,
      name: String,
      password: String,
      clientId: String,
      email: String
    },
    options: {
      collection: 'user'
    }
  }
})
