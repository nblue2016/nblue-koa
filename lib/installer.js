// use namespace
const cp = require('child_process')

// define child process method of execute
const METHOD_NAME_OF_EXEC = 'execSync'

// assign console to C
const C = console

// define function for execute
const exec = cp[METHOD_NAME_OF_EXEC]

class Installer {

  mapVersion (pack) {
    if (pack.indexOf('@') > 0) {
      return pack.substring(0, pack.indexOf('@'))
    }

    return pack
  }

  filter (pack) {
    try {
      require(this.mapVersion(pack))

      return false
    } catch (err) {
      return true
    }
  }

  install (packages) {
    // exit if there is no package need install
    if (!packages || packages.length === 0) return

    // generate install commmand for packages
    const cmd = `npm cache clear\r\nnpm install ${packages.join(' ')}`

    // convert a line for name array
    const nameLine = packages.join(', ')

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

}

module.exports = Installer
