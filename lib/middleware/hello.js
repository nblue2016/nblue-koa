const koa = function () {
  return function *(next) {
    const ctx = this

    ctx.body = 'Hello World!'

    yield next
  }

}

module.exports = {
  koa
}
