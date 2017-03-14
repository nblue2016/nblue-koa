const assert = require('assert')
const core = require('nblue-core')
const aq = core.aq
const co = core.co

const headers = {
  'context-type': 'application/json',
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

module.exports = function (app, model) {
  let id = null

  const serverAddress = app.getServerUrl()

  const getid = (data) => {
    if (data._id) return data._id
    else if (data.id) return data.id

    return null
  }

  const createdBody = getCreatedBody(model)
  const updatedBody = getUpdatedBody(model)
  const createdKeys = Object.keys(createdBody)

  it(`${model} - OPTIONS::PASS`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/`
      const rt = yield aq.rest(url, 'OPTIONS', headers)

      assert.ok(rt, 'OPTIONS::/PASS')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/test`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/test`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/test')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/model`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/model`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/model')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/list`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/list`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/list')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/count`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/count`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/count')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - POST::/create`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/create`
      const rt = yield aq.rest(url, 'POST', headers, createdBody)

      assert.ok(rt, 'POST::/create')

      // get identity of created item
      id = yield aq.then(getid(rt))
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/getquery`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/query?` +
        `${createdKeys[0]}=${createdBody[createdKeys[0]]}`

      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/getquery (?key=val)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/count (?key=val)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/count?` +
        `${createdKeys[0]}=${createdBody[createdKeys[0]]}`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/count (?key=val)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/retrieve (key/val)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/` +
        `${createdKeys[0]}/${createdBody[createdKeys[0]]}`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/retrieve (key/val)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - GET::/get (:id)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/${id}`
      const rt = yield aq.rest(url, 'GET', headers)

      assert.ok(rt, 'GET::/get (:id)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - POST::/count (filter)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/count`
      const rt = yield aq.rest(url, 'POST', headers, createdBody)

      assert.ok(rt, 'POST::/count (filter)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - POST::/query (filter)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/query`
      const rt = yield aq.rest(url, 'POST', headers, createdBody)

      assert.ok(rt, 'POST::/query (filter)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - PUT::/getup (:id)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/${id}`
      const rt = yield aq.rest(url, 'PUT', headers, updatedBody)

      assert.ok(rt, 'PUT::/getup (:id)')

      id = yield aq.then(getid(rt))
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - PUT::/update`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/`
      const rt = yield aq.rest(url, 'PUT', headers, {
        $filter: updatedBody,
        $modifier: createdBody
      })

      assert.ok(rt, 'PUT::/update')
      assert.ok(rt.ok, 'PUT::/update')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - DELETE::/getdel (:id)`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/${id}`
      const rt = yield aq.rest(url, 'DELETE', headers)

      assert.ok(rt, 'DELETE::/getdel (:id)')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - POST::/create again`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/create`
      const rt = yield aq.rest(url, 'POST', headers, createdBody)

      assert.ok(rt, 'POST::/create again')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - DELETE::/delete`, (done) => {
    co(function *() {
      const url = `${serverAddress}/api/${model}/`
      const rt = yield aq.rest(url, 'DELETE', headers, createdBody)

      assert.ok(rt, 'DELETE::/delete')
      assert.ok(rt.ok, 'DELETE::/delete')
      assert.equal(rt.n, 1, 'DELETE::/delete')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - DELETE::/delete`, (done) => {
    co(function *() {
      const deleteFilter = {}

      deleteFilter[createdKeys[0]] = ''

      const url = `${serverAddress}/api/${model}/`
      const rt = yield aq.rest(url, 'DELETE', headers, deleteFilter)

      assert.ok(rt, 'DELETE::/delete')
      assert.ok(rt.ok, 'DELETE::/delete')
    }).
    then(() => done()).
    catch((err) => done(err))
  })

  it(`${model} - CLEAR`, () => null)
}
