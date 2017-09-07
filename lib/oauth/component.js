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

}

module.exports = OAuthComponent
