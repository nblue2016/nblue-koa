// use libraries
const cobody = require('co-body')
const core = require('nblue-core')
const Component = require('./super')

const co = core.co

class JsonComponent extends Component {

  constructor (nblue) {
    super(nblue)

    this._name = 'json'
    this._handlers = new Map()
  }

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

      // use co-body to parse json
      const data = yield cobody.json(req, opts)

      // set json data to request body
      if (data) req.body = data
    })
  }

}

module.exports = JsonComponent
