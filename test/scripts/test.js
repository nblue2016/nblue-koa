script({
  ary1: [1, 2, 3],
  ary2: [4, 5, 6],
  log_level: () => config().
    get('logger').
    get('level'),
  newid: (ctx) => co(function *() {
    const userData = {
      name: 'test',
      nick: 'goodman'
    }

    const user = yield ctx.$execute(
      'user',
      (adapter) => adapter.create(userData)
    )

    return user._id
  }),
  user: (ctx) => ctx.$get(
      `http://127.0.0.1:8088/api/user/${ctx.newid}`, {
        scope: 'admin'
      })
})
