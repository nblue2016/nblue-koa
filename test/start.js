const NKoa = require('../lib')
const nkoa = new NKoa()
const configFile = `${process.cwd()}/test/config.yml`

nkoa.
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
  })

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
