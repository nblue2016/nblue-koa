class Context
{

  static getConfig (ctx) {
    return Context.getObject(ctx, 'config')
  }

  static setConfig (ctx, config) {
    Context.setObject(ctx, 'config', config)
  }

  static getLogger (ctx) {
    return Context.getObject(ctx, 'logger')
  }

  static setLogger (ctx, logger) {
    Context.setObject(ctx, 'logger', logger)
  }

  static getSchemas (ctx) {
    return Context.getObject(ctx, 'schemas')
  }

  static setSchemas (ctx, schemas) {
    Context.setObject(ctx, 'schemas', schemas)
  }

  static getConnections (ctx) {
    return Context.getObject(ctx, 'conns')
  }

  static setConnections (ctx, conns) {
    Context.setObject(ctx, 'conns', conns)
  }

  static getModelContext (ctx) {
    return Context.getObject(ctx, 'model')
  }

  static setModelContext (ctx, model) {
    Context.setObject(ctx, 'model', model)
  }

  static getObject (ctx, name) {
    if (!ctx) return null

    const key = Context.getObjectKey(name)

    if (ctx[key]) return ctx[key]
    if (ctx[name]) return ctx[key]

    return null
  }

  static setObject (ctx, name, obj) {
    if (ctx) {
      const key = Context.getObjectKey(name)

      ctx[key] = obj
      ctx[name] = obj
    }
  }

  static getObjectKey (name) {
    return `$${name}`
  }

  static getApp (app, name) {
    let App = null

    switch (name.toLocaleLowerCase()) {
    case 'logger':
    case 'nblue-logger':
      App = require('./middleware/logger-app')
      break
    case 'static':
    case 'nblue-static':
      App = require('./middleware/app-static')
      break
    case 'scope':
    case 'nblue-scope':
      App = require('./middleware/app-scope')
      break
    case 'json':
    case 'nblue-json':
      App = require('./middleware/app-json')
      break
    case 'form':
    case 'nblue-form':
      App = require('./middleware/form-app')
      break
    case 'data':
    case 'nblue-data':
      App = require('./middleware/hello-app')
      break
    case 'hello':
    case 'nblue-hello':
      App = require('./middleware/data-app')
      break
    default:
      try {
        App = require(name)
      } catch (err) {
        App = null
      }
      break
    }

    if (!App) {
      throw new Error(`not support middleware (${name})`)
    }

    const instance = new App(app)

    return typeof instance.koa === 'function'
      ? instance.koa()
      : instance
  }

}

module.exports = Context
