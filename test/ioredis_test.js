const core = require('nblue-core')
const aq = core.aq
const co = core.co

const Redis = require('ioredis')
const C = console

const url = 'redis://localhost/1'
const redis = new Redis(url)

const gen = function *() {
  yield redis.set('test', 'ok1')

  yield redis.hset('fields', 'key1', 'ok2')

  const v1 = yield redis.get('test')

  const v2 = yield redis.hget('fields', 'key1')

  const v3 = yield redis.exists('fields')

  const v4 = yield redis.exists('fields2')

  const output = {
    v1,
    v2,
    v3,
    v4
  }

  C.log(output)

  yield aq.then(redis.disconnect())
}

co(gen)
