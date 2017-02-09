const core = require('nblue-core')
const NKoa = require('../lib')

const co = core.co

const configFile = `${process.cwd()}/test/config.yml`

const nkoa = new NKoa()

co(function *() {
  yield nkoa.create({ configFile })

  // load defined middlewares
  yield nkoa.use()

  // appned defined routers
  yield nkoa.routes()

  // listen port to start web server
  nkoa.listen()
})
