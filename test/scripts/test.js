script({
  ary1: [1, 2, 3],
  ary2: [4, 5, 6],
  log_level: () => config().
    get('logger').
    get('level'),
  newid: (ctx) => co(function *() {
    const adpt = yield ctx.$getDbAdapter('user')

    const user = yield adpt.create({
      name: 'test',
      nick: 'bluebat'
    })

    return user._id
  }),
  user: (ctx) => {
    const headers = {
      scope: 'admin'
    }

    return rest(
      `http://127.0.0.1:8088/rest/user/${ctx.newid}`,
      'GET',
      headers
    )
  }
})
