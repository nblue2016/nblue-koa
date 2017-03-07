// const core = require('nblue-core')
// const Koa = require('../lib').Koa
const Express = require('../lib').Express

// const app = new Koa()
const app = new Express()

app.start({
  configFile: `${process.cwd()}/test/config.yml`
})
