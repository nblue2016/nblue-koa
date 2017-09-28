// use library
const path = require('path')

// get path of module by resolve method
const modulePath = require.resolve('oauth2-server')

module.exports = function (name) {
  // check for arguments
  if (!name) throw new ReferenceError('name')

  // declare file name
  let filename = null

  // get file name with class name
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

  // get full path with dir name and file name from oauth2-server
  const fullpath = `${path.dirname(modulePath)}/lib/handlers/${filename}`

  // return class by full path
  return require(fullpath)
}
