const Application = require('../lib').Express
// const Application = require('../lib').Koa
const Constants = require('../lib').Constants

const C = console

// const app = new Koa()
const napp = new Application()

napp.on(Constants.EventOfServerInitialized,
  () => {
    C.log(`${napp.ServerType} initialized`)
  })

napp.on(Constants.EventOfServerUsed,
  () => {
    C.log(`${napp.ServerType} used`)
  })

napp.on(Constants.EventOfServerRouted,
  () => {
    C.log(`${napp.ServerType} routed`)
  })

napp.start({
  configFile: `${process.cwd()}/test/config.yml`
})
