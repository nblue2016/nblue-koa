const nblue = require('../lib')
// const Application = require('../lib').Express
// const Application = require('../lib').Koa
const Constants = require('../lib').Constants

const C = console

const opts = {
  configFile: `${process.cwd()}/test/config.yml`,
  autoInstall: true
}

let App = nblue.Koa

if (process.argv.includes('express')) {
  App = nblue.Express
} else if (process.argv.includes('koa2')) {
  App = nblue.Koa2
}

// const app = new Koa()
const napp = new App(opts)

napp.on(Constants.EventOfServerCreate,
  () => {
    C.log(`${napp.ServerType} create`)
  })

napp.on(Constants.EventOfServerInitializ,
  () => {
    C.log(`${napp.ServerType} initialize.`)
  })

napp.on(Constants.EventOfServerUse,
  () => {
    C.log(`${napp.ServerType} use.`)
  })

napp.on(Constants.EventOfServerRout,
  () => {
    C.log(`${napp.ServerType} route.`)
  })

napp.on(Constants.EventOfServerStop,
  () => {
    C.log(`${napp.ServerType} stop.`)
  })

napp.on(Constants.EventOfServerExit,
  () => {
    C.log(`${napp.ServerType} exit.\r\n`)
  })

napp.start()
