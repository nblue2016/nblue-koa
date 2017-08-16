schemas({
  $database: {
    default: 'oauth'
  },
  user: {
    model: {
      id: String,
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
