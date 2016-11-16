const NKoa = require('../lib/nkoa.js')
const nkoa = new NKoa()

nkoa.
  create(`${process.cwd()}/test/config.yml`).
  then(() => nkoa.use()).
  then(() => {
    const app = nkoa.App

    app.use(function *(next) {
      const ctx = this
      const config = ctx.config
      const logger = ctx.logger
      const conns = ctx.conns

      if (config) {
        if (logger) logger.info('found config.')
      }

      if (logger) {
        if (logger) logger.info('found logger.')
      }

      if (conns) {
        if (logger) logger.info('found connections')
      }

      yield next
    })
  }).
  then(() => nkoa.routes()).
  then(() => nkoa.listen()).
  catch(() => null)
