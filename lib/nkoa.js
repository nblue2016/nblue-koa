const http = require('http')
// const https = require('https')
const koa = require('koa')
const nblue = require('nblue')

const aq = nblue.aq
const co = nblue.co
const Betch = nblue.Betch
const ConfigMap = nblue.ConfigMap

const LoggerMW = require('./middleware/logger')
const StaticMW = require('./middleware/static')
const ScopeMW = require('./middleware/scope')
const JsonMW = require('./middleware/json')
const HelloMW = require('./middleware/hello')
const DataMW = require('./middleware/data')

class nkoa
{

  constructor (app) {
    this._app = app ? app : koa()
  }

  get App () {
    return this._app
  }

  get Context () {
    return this.App.context
  }

  create (configFile, options) {
    const that = this
    const ctx = that.Context
    const file = configFile ? configFile : `${process.cwd()}/config.yml`
    const opts = options || {}

    return co(function *() {
      const config = yield that.createConfig(file, opts)

      // get website settings
      const settings = config.get('settings')

      if (ctx) {
        ctx.config = config
        if (settings) ctx.settings = settings
      }

      Betch.config = config

      if (!settings.has('base')) {
        settings.set('base', process.cwd())
      }

      const logger =
        config.has('logger')
          ? new LoggerMW().create(config, {})
          : null

      if (ctx && logger) ctx.logger = logger

      const schemas =
        config.has('schemas')
          ? yield new DataMW().create(that)
          : null

      if (ctx && schemas) ctx.schemas = schemas

      return ctx
    })
  }

  createConfig (file, options) {
    const opts = options || {}
    const app = opts ? opts.app : null

    if (!opts.envs) {
      opts.envs = []

      // append envirnment name to array
      const appendEnv = (env) => {
        const envs = opts.envs

        let name = null

        switch (env) {
        case 'development':
          name = 'dev'
          break
        case 'production':
          name = 'prod'
          break
        default:
          name = env
          break
        }
        if (!envs.includes(name)) envs.push(name)
      }

      const args = process.argv

      // parse envs from applciation
      if (app && app.env) {
        if (Array.isArray(app.env)) {
          app.env.
            forEach((appEnv) => appendEnv(appEnv))
        } else {
          appendEnv(app.env)
        }
      }

      // parse arguments of envirnment
      if (args.includes('--debug')) appendEnv('debug')
      if (args.includes('--release')) appendEnv('release')

      /* parse envirnment variants
      if(process.env.NODE_ENV){
        const env = process.env.NODE_ENV

        if (env.indexOf(',' >= 0)){
          env.
            split(',', -1).
            forEach((item) => appendEnv(item.trim()))
        } else {
          appendEnv(env)
        }
      }
      */

      {
        const envsArg = '--env='
        // support arguments like --envs=dev,qa

        args.
          filter((val) => val.startsWith(envsArg)).
          forEach((val) => {
            const index = val.indexOf(envsArg)
            const env = val.substring(index + envsArg.length)

            if (env.indexOf(',' < 0)) appendEnv(env)
            else {
              env.
                split(',', -1).
                forEach((item) => appendEnv(item.trim()))
            }
          })
      }
    }

    return co(function *() {
      let config = null

      if (opts.envs &&
          Array.isArray(opts.envs) &&
          opts.envs.length === 0) {
        config = yield ConfigMap.parseConfig(file)
      } else {
        config = yield ConfigMap.parseConfig(file, opts.envs)
      }

      return config
    })
  }

  listen () {
    const app = this.App
    const ctx = this.Context
    const settings = ctx.settings

    const logger = ctx.logger

    if (logger) {
      logger.info(`start web services on ${settings.get('port')}`)
    }

    // we can choose http or https
    return http.
      createServer(app.callback()).
      listen(settings.get('port'))
  }

  use () {
    const that = this
    const app = that.App
    const ctx = that.Context
    const config = ctx.config

    const mws = config.get('middlewares')

    if (mws) {
      if (Array.isArray(mws)) {
        mws.forEach((mw) => app.use(that.getMiddleware(mw)))
      } else {
        app.use(that.getMiddleware(mws))
      }
    }
  }

  routes () {
    const RestRouter = require('./router/rest-router')
    const RestsRouter = require('./router/rests-router')

    const that = this
    const ctx = that.Context
    const config = ctx.config ? ctx.config : new Map()
    const logger = ctx.logger ? ctx.logger : null

    const getAdapter = (name) => {
      switch (name.toLowerCase()) {
      case 'nblue-rest':
        return RestRouter
      case 'nblue-rests':
        return RestsRouter
      default:
        return require(name)
      }
    }

    const getRouter = (configFile) => {
      try {
        if (!configFile) {
          throw new Error(`can't find config by file:${config}`)
        }

        return co(function *() {
          // get base folder from config file or use current directory
          const base = config.has('base') ? config.get('base') : process.cwd()

          // parse full config name
          const fullConfigFile = `${base}/${configFile}`

          // create config map by file name
          const routerConfigMap = yield ConfigMap.parseConfig(fullConfigFile)

          // get instance of global config
          const globalConfig = ctx.config ? ctx.config : new Map()

          // get settings from global config
          const globalSettings = globalConfig.has('settings')
            ? globalConfig.get('settings')
            : new Map()

          // create empty map if router config hasn't settings
          if (!routerConfigMap.has('settings')) {
            routerConfigMap.set('settings', new Map())
          }

          // get settings from router config
          const routerSettings = routerConfigMap.get('settings')

          // merge settings in global settings to router settings
          for (const [key, val] of globalSettings.entries()) {
            if (routerSettings.has(key)) continue
            routerSettings.set(key, val)
          }

          // get the name of router adpater
          const adapterName = routerConfigMap.get('name')

          // get class of router adapter by name
          const Adapter = getAdapter(adapterName)

          // create new instance of router adapter by config map
          const adapter = new Adapter(that, routerConfigMap)

          // bind router to application
          return adapter.bind()
        })
      } catch (err) {
        // catch error
        const message = `create router failed, details: ${err.message}`

        if (logger) logger.error(message)

        return Promise.reject(err)
      }
    }

    // find defined routers from config file
    if (config.has('routes')) {
      aq.series(
        config.
          get('routes').
          map((item) => getRouter(item))
      )
    }
  }

  getMiddleware (name) {
    const that = this

    switch (name) {
    case 'nblue-logger':
      return new LoggerMW().koa(that)
    case 'nblue-static':
      return new StaticMW().koa(that)
    case 'nblue-scope':
      return new ScopeMW().koa(that)
    case 'nblue-json':
      return new JsonMW().koa(that)
    case 'nblue-data':
      return new DataMW().koa(that)
    case 'nblue-hello':
      return new HelloMW().koa(that)
    default:
      throw new Error(`not support middleware (${name})`)
    }
  }

}

module.exports = nkoa
