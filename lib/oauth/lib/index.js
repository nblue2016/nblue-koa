const server = require('oauth2-server')

exports = require('./server')

Object.
  keys(server).
  forEach((key) => {
    exports[key] = server[key]
  })

module.exports = exports
