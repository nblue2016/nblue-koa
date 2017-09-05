// reference libraries
const path = require('path')
const core = require('nblue-core')

const Component = require('./super')

// use co in nblue core
const aq = core.aq
const co = core.co

class ComplexComponent extends Component {

  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // invoke super constructor function
    super(nblue, opts)

    // set name of current component if it exits in options
    if (opts.name) {
      this._name = opts.name
    }
  }

  initialize (options) {
    super.initialize(options)

    this._dc = null
  }

  get DataComponent () {
    return this._dc
  }

  create () {
    // define create function from super class
    const createFunc = super.create.bind(this)

    // create generator function
    const gen = function *() {
      // invoke super create method
      yield createFunc({ base: __dirname })

      // create optiosn for create data component
      const coOpts = {
        new: true,
        config: this.Config,
        global: false
      }

      // create data component for current component
      this._dc = yield this.createDataComponent(coOpts)

      // bind controllers and return promise
      return yield this.bindControllers()
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  createDataComponent (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of component manager
    const cmgr = this.ComponentManager

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
      return aq.then(dc.create(createOpts))
    }

    return Promise.resolve()
  }

  bindControllers () {
    // get controller manager from nblue
    const ctlmgr = this.NBlue.ControllerManager

    // get instance of controller config
    const config = this.Config

    // get array of definition controllers
    const controllers = config.getArray('controllers')

    controllers.forEach(
      (controller) => {
        if (!controller.has('src')) {
          controller.set(
            'src',
            path.join(__dirname, 'controller.js')
          )
        }

        if (!controller.has('creator')) {
          controller.set('creator', this.Name)
        }
      }
    )

    controllers.forEach((item) => {
      ctlmgr.registerController(this.Name, item)
    })
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

module.exports = ComplexComponent
