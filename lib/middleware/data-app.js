// const path = require('path')
const fs = require('fs')
const nblue = require('nblue')
const ndata = require('nblue-data')

const aq = nblue.aq
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

class DataApp {

  constructor (app) {
    this._app = app
  }

  get App () {
    return this._app
  }

  koa () {
    return function *(next) {
      const ctx = this
      const config = ctx.config
      const logger = ctx.logger
      const schemas = ctx.schemas

      try {
        if (!schemas) throw new Error('can\'t find schemas in context.')

        if (ctx.conns) {
          if (logger) logger.info('connections has already been created')

          return yield next
        }

        // create new instance of db connections
        const conns = new DbConnections(schemas)

        // register proxies
        // console.log(conns)

        // create connection by config
        conns.createByConfigs(config)

        // bind connections to context
        ctx.conns = conns

        // output info to logger
        if (logger) logger.verbose('created db connections.')
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        // create empty object
        if (ctx.conn) ctx.conn = null
      }

      return yield next
    }
  }

  static parseSchemas (ctx) {
    return co(function *() {
      const app = ctx
      const config = ctx.config
      const settings = ctx.settings
      const logger = ctx.logger

      // create new array of schema files
      const files = []

      const base = settings.get('base', process.cwd())
      // settings.has('base') ? settings.get('base') : process.cwd()
      const mapFile = (val) => co(function *() {
        const stat = yield aq.statFile(val)

        // push it to array if it is a file
        if (stat.isFile()) return files.push(val)

        // read sub-files if it is a directory
        const items = yield aq.callback((cb) => fs.readdir(val, cb))

        return items.
          filter((item) => !item.startsWith('.')).
          filter((item) => item.endsWith('.json') || item.endsWith('.js')).
          map((item) => `${val}/${item}`).
          forEach((item) => files.push(item))
      })

      try {
        // get all schema files in defined folder
        yield aq.parallel(
          config.
            get('schemas').
            map((val) => `${base}/${val}`).
            map((val) => mapFile(val))
        )

        if (files.length === 0) {
          throw new Error('can\'t find any schema.')
        }

        files.forEach((file) => {
          // record every file in log
          if (logger) logger.verbose(`found schema file: ${file}.`)
        })

        // parse schema
        const schemas = yield Schemas.parse(files)

        if (app.context) app.context.schemas = schemas

        // output info to logger
        if (logger) logger.verbose('parsed schemas files.')

        return schemas
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        return null
      }
    })
  }

}

module.exports = DataApp
