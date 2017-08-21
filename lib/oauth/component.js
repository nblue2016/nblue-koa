const Component = require('./../components/super')
const Controller = require('./controller')
const core = require('nblue-core')
const co = core.co

class OAuthComponent extends Component {

  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // set component name to options
    if (!opts.name) opts.name = 'oauth'

    // invoke super constructor function
    super(nblue, opts)
  }

  get DataComponent () {
    return this._dc
  }

  create () {
    // define create function from super class
    const createFunc = super.create.bind(this)

    // create generator function
    const gen = function *() {
      yield createFunc({ dir: __dirname })

      const cmgr = this.ComponentManager

      const opts = {
        new: true,
        config: this.Config,
        global: false
      }

      // get new instance of data component
      const dc = cmgr.getComponent('data', opts)

      // call create function to initialize data component
      if (dc.create &&
          typeof dc.create === 'function') {
        // generate options for creating
        const createOpts = this.Config.has('schemas')
          ? {}
          : { schemas: 'models', base: __dirname }

        // invoke create function
        yield dc.create(createOpts)
      }

      // get controller manager from nblue
      const ctlmgr = this.NBlue.ControllerManager

      const config = this.Config

      const controllers = config.getArray('controllers')

      controllers.forEach(
        (controller) => {
          controller.set('target', Controller)
        }
      )

      controllers.forEach((item) => {
        ctlmgr.registerController('oauth', item)
      })


      // register controller for oauth component

      /* const newUser = {
        name: 'sdfdsf',
        password: '123456'
      }

      yield dc.pexecute(
        'user',
        (adapter) => adapter.create(newUser)
      )

      const users = yield dc.pexecute(
        'user',
        (adapter) => adapter.retrieve({ name: 'sdfdsf' })
      )*/

      // set data component to private variant
      this._dc = dc

      return Promise.resolve()
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  release () {
    if (this._dc) {
      if (this._dc.release &&
          typeof this._dc.release === 'function') {
        this._dc.release()
      }
      this._dc = null
    }
  }

}

module.exports = OAuthComponent
