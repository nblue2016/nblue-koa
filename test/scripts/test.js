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

    /* const user = yield ctx.$pexec(
      'user',
      (adapter) => adapter.create(userData)
    )*/

    const user = { _id: 'sdfsd' }

    return user._id
  })
  // user: (ctx) => ctx.$get(`/api/user/${ctx.newid}`)
})
