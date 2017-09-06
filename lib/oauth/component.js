// const Component = require('./../components/super')
const Component = require('./../components/complex')

// define constants
const COMPONENT_NAME = 'oauth'

class OAuthComponent extends Component {

  // define constructor function
  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // set component name to options
    if (!opts.name) opts.name = COMPONENT_NAME

    // invoke super constructor function
    super(nblue, opts)
  }

  getDataCompomentOptions (options) {
    // assign options to opts
    const opts = options || {}

    // add schemas options
    if (this.Config.has('schemas')) {
      opts.schemas = 'models'
      opts.base = __dirname
    }

    // return options
    return opts
  }

}

module.exports = OAuthComponent
