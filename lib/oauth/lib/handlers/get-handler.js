// use library
const path = require('path')
const modulePath = require.resolve('oauth2-server')

module.exports = function (name) {
  // check for arguments
  if (!name) throw new ReferenceError('name')

  let filename = null

  switch (name) {
  case 'authenticate':
    filename = 'authenticate-handler.js'
    break
  case 'authorize':
    filename = 'authorize-handler.js'
    break
  case 'token':
    filename = 'token-handler.js'
    break
  default:
    throw new Error(`can't find handler by name:$ {name}`)
  }

  return require(`${path.dirname(modulePath)}/lib/handlers/${filename}`)
}
