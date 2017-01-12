const NKoa = require('../lib/nkoa.js')
const nkoa = new NKoa()
const configFile = `${process.cwd()}/test/config.yml`

nkoa.
  create(configFile).
  then(() => {
    nkoa.use()
    nkoa.routes()
    nkoa.listen()
  }).
  catch((err) => {
    console.log(err)
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
