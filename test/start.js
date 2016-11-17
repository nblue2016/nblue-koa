const NKoa = require('../lib/nkoa.js')
const nkoa = new NKoa()

nkoa.
  create(`${process.cwd()}/test/config.yml`).
  then(() => nkoa.use()).
  then(() => nkoa.routes()).
  then(() => nkoa.listen()).
  catch(() => null)
