const nblue = require('nblue-core')
const NKoa = require('../lib')
const co = nblue.co

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

/* nkoa.
  create(configFile).
  then(() => nkoa.use()).
  then(() => nkoa.routes()).
  then(() => nkoa.listen()).
  catch((err) => {
    const ctx = nkoa.Context

    const logger = ctx.logger

    if (logger) {
      logger.error(err.message)
    }
  }) */

  /*
  co(function *() {
    yield nkoa.create(configFile)

    nkoa.use()
    nkoa.routes()
    nkoa.listen()
  }).
  catch((err) => {
    const ctx = nkoa.Context
    const logger = ctx.$logger

    if (logger) {
      logger.error(err.message)
    }
  })
  */
