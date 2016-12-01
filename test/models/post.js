schemas({
  $database: {
    default: 'db1'
  },
  post: {
    model: {
      title: String,
      key: String,
      size: Number,
      abstract: 'String',
      content: String,
      tags: [String],
      publishedOn: Buffer,
      publishedBy: String,
      email: String,
      status: Number,
      viewCount: Number,
      likeCount: Number,
      CanComment: Boolean
    },
    options: {
      collection: 'post'
    }
  }
})
