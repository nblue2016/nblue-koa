// reference libraries
const path = require('path')
const core = require('nblue-core')

const Component = require('./super')

// use co in nblue core
const co = core.co

class ComplexComponent extends Component {

  initialize (options) {
    super.initialize(options)

    this._dc = null
  }

  get DataComponent () {
    return this._dc
  }

  _create (options) {
    // assign options to opts
    const opts = options || {}

    // create generator function
    const gen = function *() {
      // create data component for current component
      this._dc = yield this.createDataComponent(opts)

      // bind controllers and return promise
      return this.bindControllers(opts)
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  createDataComponent (options) {
    // assign options to opts
    const opts = options || {}

    // get instance of component manager
    const cmgr = this.ComponentManager

    // get options for initialize component
    const initOpts = this.getDataCompomentOptions('initialize', opts)

    // get new instance of data component
    const dc = cmgr.getComponentByName('data', initOpts)

    // define generator function for create data component
    const gen = function *() {
      // call create function to initialize data component
      if (dc.create &&
          typeof dc.create === 'function') {
        // generate options for create data component
        const createOpts = this.getDataCompomentOptions('create', opts)

        // invoke create function
        yield dc.create(createOpts)
      }

      // return created data component
      return dc
    }

    // invoke generator function
    return co(gen.bind(this))
  }

  getDataCompomentOptions (method, options) {
    // assign options to opts
    const opts = options || {}

    // get instance of startup options
    const startupOpts = this.StartupOptions

    switch (method.toLowerCase()) {
    case 'initialize':
      // return options for initialize
      return { new: true }
    case 'create': {
      // return options for create
      return {
        dirname: startupOpts.dirname,
        schemas: 'models',
        config: this.Config
      }
    }
    default:
      // return options for other method
      return opts
    }
  }

  bindControllers () {
    // get base folder from options or nblue
    const baseFolder = this.getBaseFolder()

    // get controller manager from nblue
    const ctlmgr = this.NBlue.ControllerManager

    // get instance of controller config
    const config = this.Config

    // get array of definition controllers
    const items = config.getArray('controllers')

    // fetch all items in controllers definition
    items.forEach(
      (item) => {
        if (!item.has('src')) {
          item.set('src', path.join(baseFolder, 'controller.js'))
        }

        if (!item.has('componentId')) {
          item.set('componentId', this.Uid)
        }
      }
    )

    // !! there is a bug
    items.forEach((item) => {
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
