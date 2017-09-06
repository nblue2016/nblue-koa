// use libraries
const cobody = require('co-body')
const core = require('nblue-core')

// delcare base class for Component
const Component = require('./super')

// define constants
const COMPONENT_NAME = 'json'

// get modules from nblue core
const co = core.co

class JsonComponent extends Component {

  // define constructor function
  constructor (nblue) {
    // invoke super constructor
    super(nblue, { name: COMPONENT_NAME })
  }

  // the function will implement a middleware for all server type
  middleware (ctx, options) {
    // assign options to opts
    const opts = options || {}

    // set default value for options
    if (opts.strict === null) opts.strict = true

    // get request from context
    const req = ctx.request

    // co a generator function to return a Promise
    return co(function *() {
      // ignore parse when the method of request is 'GET' or 'OPTIONS'
      if (req.method.toUpperCase() === 'GET' ||
        req.method.toUpperCase() === 'OPTIONS') return

      // get length of request body
      const length = req.headers['content-length']

      // exit if can't find length in headers or length is zero
      if (!length || length && length === 0) return

      // use co-body to parse json to a object
      const data = yield cobody.json(req, opts)

      // bind json data to request body
      if (data) req.body = data
    })
  }

}

module.exports = JsonComponent
