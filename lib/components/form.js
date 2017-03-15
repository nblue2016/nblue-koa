// use libraries
const cobody = require('co-body')
const core = require('nblue-core')
const Component = require('./super')

const co = core.co

class FormComponent extends Component {

  // a koa middleware to parse FORM in request body
  koa (options) {
    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function *(next) {
      // get instance of context
      const ctx = this

      // get request from context
      const req = ctx.request

      // parse JSON body
      return yield parseFunc(req, options).
        then(() => next)
    }
  }

  // a koa2 middleware to parse FORM in request body
  koa2 (options) {
    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function (ctx, next) {
      // get request from context
      const req = ctx.request

      // parse JSON body
      return parseFunc(req, options).
        then(() => next())
    }
  }

  // an express middleware to parse FORM in request body
  express (options) {
    // define function to parse body
    const parseFunc = this.parseBody.bind(this)

    // return middleware function
    return function (req, res, next) {
      return parseFunc(req, options).
        then(() => next())
    }
  }

  getOptions (options) {
    return options || { strict: true }
  }

  parseBody (req, options) {
    // assign options to opts
    const opts = this.getOptions(options)

    // co a generator function to return a Promise
    return co(function *() {
      // ignore parse when the method of request is 'GET' or 'OPTIONS'
      if (req.method.toUpperCase() === 'GET' ||
        req.method.toUpperCase() === 'OPTIONS') return

      // get length of request body
      const length = req.headers['content-length']

      // exit if length equals zero
      if (length && length === 0) return

      // use co-body to parse json
      const data = yield cobody.form(req, opts)

      // set json data to request body
      if (data) req.body = data
    })
  }

}

module.exports = FormComponent
