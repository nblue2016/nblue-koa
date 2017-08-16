// const Server = require('oauth2-server')
const Component = require('./../components/super')
const core = require('nblue-core')
const co = core.co

class OAuthComponent extends Component {

  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // set component name to options
    opts.name = 'oauth'

    // invoke super constructor function
    super(nblue, opts)
  }

  create () {
    // define create function from super class
    const createFunc = super.create.bind(this)

    // create generator function
    const gen = function *() {
      return yield createFunc({ dir: __dirname })
    }

    // invoke generator function
    return co(gen.bind(this))
  }

}

module.exports = OAuthComponent
