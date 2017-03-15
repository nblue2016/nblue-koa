const startOpts = {
  configFile: `${process.cwd()}/test/config.yml`
}

describe('server', () => {
  const App = require('../lib')
  const apps = [
    new App.Express(startOpts),
    new App.Koa(startOpts)
    // new App.Koa2(startOpts)
  ]

  for (const app of apps) {
    it(`start/stop ${app.ServerType} server`, (done) => {
      // start a web server
      app.start().
        then(() => app.stop()).
        then(() => done()).
        catch((err) => done(err))
    })

    require('./static')(app)
    require('./apis')(app)
  }
})
