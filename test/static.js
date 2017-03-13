const assert = require('assert')
const core = require('nblue-core')
const aq = core.aq
const co = core.co

module.exports = function (app) {
  return describe(`test static for ${app.ServerType}`, () => {
    let serverAddress = null

    before((done) => {
      // start web server
      co(function *() {
        try {
          // start web server
          yield app.start()

          serverAddress = app.getServerUrl()

          done()
        } catch (err) {
          done(err)
        }
      })
    })

    it('static page(test.html)', (done) => {
      co(function *() {
        const rt = yield aq.rest(`${serverAddress}/test.html`, 'GET')

        assert.ok(rt, 'static page')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    after((done) => {
      co(function *() {
        try {
          yield app.stop()

          done()
        } catch (err) {
          done(err)
        }
      })
    })
  })
}
