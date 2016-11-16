schemas({
  $database: {
    default: 'db1'
  },
  user: {
    model: {
      name: String,
      nick: String,
      sex: Number,
      abstract: 'String',
      email: String
    },
    options: {
      collection: 'user'
    }
  }
})
