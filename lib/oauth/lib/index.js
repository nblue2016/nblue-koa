const server = require('oauth2-server')

exports = require('./server')
exports.Request = server.Request
exports.Response = server.Response

module.exports = exports
