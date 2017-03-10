const assert = require('assert')
const core = require('nblue-core')
const aq = core.aq
const co = core.co

const C = console

const headers = {
  'context-type': 'application/json, encoding=UTF-8',
  scope: 'admin'
}

const getCreatedBody = (model) => {
  switch (model) {
  case 'user':
    return {
      name: 'test::name',
      nick: 'test::nick',
      email: 'test::email@abc.com'
    }
  case 'post':
    return {
      title: 'test::title',
      key: 'test::key',
      tag: ['test::tag1', 'test::tag2']
    }
  default:
    break
  }

  return {}
}

const getUpdatedBody = (model) => {
  switch (model) {
  case 'user':
    return {
      name: 'test::name_',
      nick: 'test::nick_',
      email: 'test::email2@abc.com'
    }
  case 'post':
    return {
      title: 'test::title_',
      key: 'test::key_',
      tag: ['test::tag1_', 'test::tag2_']
    }
  default:
    break
  }

  return {}
}

const outputLine = (model, method, path) => {
  const line = ` -->\t${method} :: ${path} for ${model} OK.`

  C.log(line)
}

module.exports = function (app) {
  return describe(`test apis for ${app.ServerType}`, () => {
    let
      models = [],
      serverAddress = null

    before((done) => {
      co(function *() {
        try {
          // start web server
          yield app.start()

          serverAddress = app.getServerUrl()

          models = yield aq.rest(`${serverAddress}/api/models`, 'GET', headers)

          done()
        } catch (err) {
          done(err)
        }
      })
    })

    it('controller1 apis', (done) => {
      let
        rt = null,
        url = null

      co(function *() {
        url = `${serverAddress}/api/v1/method1`
        rt = yield aq.rest(url, 'GET', headers)
        assert.ok(rt, 'GET::/method1')

        url = `${serverAddress}/api/v1/method2`
        rt = yield aq.rest(url, 'GET', headers)
        assert.ok(rt, 'GET::/method2')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('controller2 apis', (done) => {
      let
        rt = null,
        url = null

      co(function *() {
        url = `${serverAddress}/api/v2/method1`
        rt = yield aq.rest(url, 'GET', headers)
        assert.ok(rt, 'GET::/method1')

        url = `${serverAddress}/api/v2/method2`
        rt = yield aq.rest(url, 'POST', headers)
        assert.ok(rt, 'GET::/method2')
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    it('scrpt apis', (done) => {
      let
        rt = null,
        url = null

      co(function *() {
        url = `${serverAddress}/scripts/test`
        rt = yield aq.rest(url, 'GET', headers)
        assert.ok(rt, 'GET::/scripts/test')

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

    it('model rest apis', function (done) {
      this.timeout(5000)

      let
        rt = null,
        url = null

      co(function *() {
        for (const model of models) {
          url = `${serverAddress}/api/${model}/`
          rt = yield aq.rest(url, 'OPTIONS', headers)
          outputLine(model, 'OPTIONS', '/')
          assert.ok(rt, 'OPTIONS::/')

          url = `${serverAddress}/api/${model}/test`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/test')
          assert.ok(rt, 'GET::/test')

          url = `${serverAddress}/api/${model}/model`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/model')
          assert.ok(rt, 'GET::/model')

          url = `${serverAddress}/api/${model}/list`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/list')
          assert.ok(rt, 'GET::/list')

          url = `${serverAddress}/api/${model}/count`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/count')
          assert.ok(rt, 'GET::/count')

          let id = null
          const getid = (data) => {
            if (data._id) return data._id
            else if (data.id) return data.id

            return null
          }

          const createdBody = getCreatedBody(model)

          url = `${serverAddress}/api/${model}/create`
          rt = yield aq.rest(url, 'POST', headers, createdBody)
          outputLine(model, 'POST', '/create')
          assert.ok(rt, 'POST::/create')

          // get identity of created item
          id = getid(rt)

          if (!id) throw new Error(`can't find identity for new item.`)

          const createdKeys = Object.keys(createdBody)

          url = `${serverAddress}/api/${model}/query?` +
            `${createdKeys[0]}=${createdBody[createdKeys[0]]}`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/getquery (?key=val)')
          assert.ok(rt, 'GET::/getquery (?key=val)')

          url = `${serverAddress}/api/${model}/count?` +
            `${createdKeys[0]}=${createdBody[createdKeys[0]]}`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/count (?key=val)')
          assert.ok(rt, 'GET::/count (?key=val)')

          url = `${serverAddress}/api/${model}/` +
            `${createdKeys[0]}/${createdBody[createdKeys[0]]}`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/retrieve (key/val)')
          assert.ok(rt, 'GET::/retrieve (key/val)')

          url = `${serverAddress}/api/${model}/${id}`
          rt = yield aq.rest(url, 'GET', headers)
          outputLine(model, 'GET', '/get (:id)')
          assert.ok(rt, 'GET::/get (:id)')

          url = `${serverAddress}/api/${model}/count`
          rt = yield aq.rest(url, 'POST', headers, createdBody)
          outputLine(model, 'POST', '/count (filter)')
          assert.ok(rt, 'POST::/count (filter)')

          url = `${serverAddress}/api/${model}/query`
          rt = yield aq.rest(url, 'POST', headers, createdBody)
          outputLine(model, 'POST', '/query (filter)')
          assert.ok(rt, 'POST::/query (filter)')

          const updatedBody = getUpdatedBody(model)

          url = `${serverAddress}/api/${model}/${id}`
          rt = yield aq.rest(url, 'PUT', headers, updatedBody)
          outputLine(model, 'PUT', '/getup (:id)')
          assert.ok(rt, 'PUT::/getup (:id)')

          id = getid(rt)

          url = `${serverAddress}/api/${model}/`
          rt = yield aq.rest(url, 'PUT', headers, {
            $filter: updatedBody,
            $modifier: createdBody
          })
          outputLine(model, 'PUT', '/update')
          assert.ok(rt, 'PUT::/update')
          assert.ok(rt.ok, 'PUT::/update')

          url = `${serverAddress}/api/${model}/${id}`
          rt = yield aq.rest(url, 'DELETE', headers)
          outputLine(model, 'DELETE', '/getdel (:id)')
          assert.ok(rt, 'DELETE::/getdel (:id)')

          url = `${serverAddress}/api/${model}/create`
          rt = yield aq.rest(url, 'POST', headers, createdBody)
          outputLine(model, 'POST', '/create')
          assert.ok(rt, 'POST::/create again')

          url = `${serverAddress}/api/${model}/`
          rt = yield aq.rest(url, 'DELETE', headers, createdBody)
          outputLine(model, 'DELETE', '/delete')
          assert.ok(rt, 'DELETE::/delete')
          assert.ok(rt.ok, 'DELETE::/delete')
          assert.equal(rt.n, 1, 'DELETE::/delete')

          const deleteFilter = {}

          deleteFilter[createdKeys[0]] = ''

          url = `${serverAddress}/api/${model}/`
          rt = yield aq.rest(url, 'DELETE', headers, deleteFilter)
          outputLine(model, 'DELETE', '/delete (empty)')
          assert.ok(rt, 'DELETE::/delete')
          assert.ok(rt.ok, 'DELETE::/delete')
        }
      }).
      then(() => done()).
      catch((err) => done(err))
    })

    after(() => app.stop())
  })
}
