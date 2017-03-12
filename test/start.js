const nblue = require('../lib')
const Constants = require('../lib').Constants

const C = console

const opts = {
  configFile: `${process.cwd()}/test/config.yml`,
  autoInstall: true
}

let App = null

if (process.argv.includes('express')) {
  App = nblue.Express
} else if (process.argv.includes('koa')) {
  App = nblue.Koa
} else if (process.argv.includes('koa2')) {
  App = nblue.Koa2
} else {
  // default use koa
  App = nblue.Koa
}

// const app = new Koa()
const app = new App(opts)

app.on(Constants.EventOfServerCreate,
  () => {
    C.log(`${app.ServerType} create`)
  })

app.on(Constants.EventOfServerInitializ,
  () => {
    C.log(`${app.ServerType} initialize.`)
  })

app.on(Constants.EventOfServerUse,
  () => {
    C.log(`${app.ServerType} use.`)
  })

app.on(Constants.EventOfServerRout,
  () => {
    C.log(`${app.ServerType} route.`)
  })

app.on(Constants.EventOfServerStop,
  () => {
    C.log(`${app.ServerType} stop.`)
  })

app.on(Constants.EventOfServerExit,
  () => {
    C.log(`${app.ServerType} exit.\r\n`)
  })

app.start()
