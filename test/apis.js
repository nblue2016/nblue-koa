const assert = require('assert')
const core = require('nblue-core')
const aq = core.aq
const co = core.co

const headers = {
  'context-type': 'application/json, encoding=UTF-8',
  scope: 'admin'
}

module.exports = function (app) {
  let models = [],
    serverAddress = null

  describe(`test apis for ${app.ServerType}`, () => {
    before((done) => {
      // start web server
      co(function *() {
        try {
          // start web server
          yield app.start()

          // get server address from nblue application
          serverAddress = app.getServerUrl()

          // get models by rests
          models = yield aq.rest(`${serverAddress}/api/models`, 'GET', headers)

          done()
        } catch (err) {
          done(err)
        }
      })
    })

    it('controller1/method1', (done) => {
      co(function *() {
        const url = `${serverAddress}/api/v1/method1`
        const rt = yield aq.rest(url, 'GET', headers)

        assert.ok(rt, 'GET::/method1')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('controller1/method2', (done) => {
      co(function *() {
        const url = `${serverAddress}/api/v1/method2`
        const rt = yield aq.rest(url, 'GET', headers)

        assert.ok(rt, 'GET::/method2')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('controller2/method1', (done) => {
      co(function *() {
        const url = `${serverAddress}/api/v2/method1`
        const rt = yield aq.rest(url, 'GET', headers)

        assert.ok(rt, 'GET::/method1')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('controller2/method2', (done) => {
      co(function *() {
        const url = `${serverAddress}/api/v2/method2`
        const rt = yield aq.rest(url, 'POST', headers)

        assert.ok(rt, 'GET::/method2')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('scrpt test.js', (done) => {
      co(function *() {
        const url = `${serverAddress}/scripts/test`
        const rt = yield aq.rest(url, 'GET', headers)

        assert.ok(rt, 'GET::/scripts/test')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('scrpt test2.js', (done) => {
      let
        rt = null,
        url = null

      co(function *() {
        url = `${serverAddress}/scripts/test2`
        rt = yield aq.rest(url, 'POST', headers)
        assert.ok(rt, 'GET::/scripts/test2')
        assert.equal(rt.r1, 5, 'GET::/scripts/test2')


        url = `${serverAddress}/scripts/test2?a1=545`
        rt = yield aq.rest(url, 'POST', headers)
        assert.ok(rt, 'GET::/scripts/test2')
        assert.equal(rt.r1, 545, 'GET::/scripts/test2?a1=545')

        url = `${serverAddress}/scripts/test2?a1=888`
        rt = yield aq.rest(url, 'POST', headers)
        assert.ok(rt, 'GET::/scripts/test2')
        assert.equal(rt.r1, 888, 'GET::/scripts/test2?a1=888')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('model rest apis', () => {
      describe('model apis', () => {
        before(() => app.start())

        for (const model of models) {
          require('./model-apis')(app, model)
        }

        after(() => app.stop())
      })
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
