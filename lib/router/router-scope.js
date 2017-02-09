const ModelRouter = require('./router-model.js')

const modelName = 'scope'

class ScopeRouter extends ModelRouter
{

  createRouter (config, options) {
    const opts = options || {}

    opts.model = modelName

    return super.createRouter(config, opts)
  }

  // define method of model, show model schema by name
  mmodel () {
    const that = this
    const dataApp = this.getAppByName('data')
    const schemas = dataApp.Schemas

    return function *() {
      // get context
      const ctx = this

      // get schema by model name
      const schema = schemas.getSchema(modelName)

      yield that.$ok(ctx, schema ? schema.model : {})
    }
  }

}

module.exports = ScopeRouter
