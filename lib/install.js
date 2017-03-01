// use namespace
const cp = require('child_process')

// define child process method of execute
const METHOD_NAME_OF_EXEC = 'execSync'

// define command method of install express with modules
const COMMAND_OF_INSTALL_EXPRESS = 'npm install express -save'

// define command method of install koa with modules
const COMMAND_OF_INSTALL_KOA = 'npm install koa koa-router koa-static -save'

// assign console to C
const C = console

// define function for execute
const exec = cp[METHOD_NAME_OF_EXEC]

const getLib = (type) => {
  // declare variants
  let
    installCmd = null,
    lib = null,
    module = null

  // init variants by type
  switch (type) {
  case 'express':
    installCmd = COMMAND_OF_INSTALL_EXPRESS
    module = 'express'
    break
  case 'koa':
  default:
    installCmd = COMMAND_OF_INSTALL_KOA
    module = 'koa'
    break
  }

  try {
    // try to get library
    lib = require(module)
  } catch (err) {
    // output message to console
    C.log(`Can't find ${module} modules, we are installing these ...`)

    // output execute command
    C.log(installCmd)

    // execute install command and get result
    const rt = exec(installCmd)

    // output install result info
    C.log(rt.toString())

    // output finish install
    C.log(`finished install to start web`)

    // get library again
    lib = require(module)
  }

  // install failed output error to console
  if (!lib) {
    C.log(
      `can't find or install ${module}, ` +
      `please install these by manually\r\n${installCmd}`
    )
  }

  // return lib
  return lib
}

module.exports = {
  koa: getLib('koa')
}
