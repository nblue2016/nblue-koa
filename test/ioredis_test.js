const core = require('nblue-core')
const aq = core.aq
const co = core.co

const Redis = require('ioredis')
const C = console

const url = 'redis://localhost/1'
const redis = new Redis(url)

const gen = function *() {
  yield redis.set('test', 'ok1')

  yield redis.hset('fields', 'key1', 'v1')
  yield redis.hset('fields', 'key2', 'v2')
  yield redis.hset('fields', 'key3', 'v3')

  const v1 = yield redis.get('test')

  const v2 = yield redis.hget('fields', 'key1')

  const v3 = yield redis.exists('fields')

  const v4 = yield redis.exists('fields2')

  const v5 = yield redis.hgetall('fields')

  const output = {
    v1,
    v2,
    v3,
    v4,
    v5
  }

  C.log(output)

  yield aq.then(redis.disconnect())
}

co(gen)
