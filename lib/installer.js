// use namespace
const cp = require('child_process')

// define child process method of execute
const METHOD_NAME_OF_EXEC = 'execSync'

// define packages that used for koa
const PACKAGES_OF_KOA = ['koa', 'koa-router', 'koa-static']

// define packages that used for express
// const PACKAGES_OF_KOA = ['express']

// assign console to C
const C = console

// define function for execute
const exec = cp[METHOD_NAME_OF_EXEC]

class Installer {

  constructor (serverType) {
    if (serverType) {
      switch (serverType.toLowerCase()) {
      case 'koa':
        this.installKoa()
        break
      default:
        break
      }
    }
  }

  installKoa () {
    return this.install(PACKAGES_OF_KOA)
  }

  install (packages) {
    // get names for uninstall packages
    const names = this.getUninstallPackages(packages)

    // exit if there is no package need install
    if (!names || names.length === 0) return

    // generate install commmand for packages
    const cmd = `npm install ${names.join(' ')} --save`

    // convert a line for name array
    const nameLine = names.join(', ')

    // output message to console
    C.log(
      `Can't find node package(s) for ${nameLine}, we are installing these ...`
    )

    // output execute command
    C.log(cmd)

    try {
      // execute install command and get result
      const rt = exec(cmd)

      // output install result info
      C.log(rt.toString())

      // output finish install
      C.log(`finished install to start web`)
    } catch (err) {
      // output error to console if install failed
      C.log(
        `can't find or install ${nameLine}, ` +
        `please install these by manually\r\n${cmd}`
      )

      throw err
    }
  }

  getUninstallPackages (packages) {
    const uninstallPackages = new Set()

    for (const name of packages) {
      try {
        require(name)
      } catch (err) {
        // append to set if use it failed
        uninstallPackages.add(name)
      }
    }

    return Array.from(uninstallPackages)
  }

}

module.exports = (serverType) => new Installer(serverType)
