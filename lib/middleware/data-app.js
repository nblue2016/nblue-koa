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
    const that = this

    return function *(next) {
      const ctx = this
      const logger = ctx.logger

      try {
        // ignore if connections was created
        if (ctx.conns) {
          if (logger) logger.info('connections has already been created')

          return yield next
        }

        // bind connections to context
        ctx.conns = that.createConnections(ctx)

        // output info to logger
        if (logger) logger.verbose('created db connections.')
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        // create empty object
        if (ctx.conns) ctx.conns = null
      }

      return yield next
    }
  }

  createConnections (ctx) {
    // create empty schema if can't find it in context
    if (!ctx.schemas) ctx.schemas = new Schemas()

    // create new instance of db connections
    const conns = new DbConnections(ctx.schemas)

    // register proxies
    // console.log(conns)

    // create connection by config
    conns.createByConfigs(ctx.config)

    return conns
  }

  static parseSchemas (app) {
    const ctx = app.context

    return co(function *() {
      const config = ctx.config
      const settings = ctx.settings
      const logger = ctx.logger

      // get base folder for schemas
      const base = settings.get('base', process.cwd())

      // create new array of schema files
      const schemaFiles = []

      // define function to parse schema folder
      const parseFolder = (dir) => co(function *() {
        const stat = yield aq.statFile(dir)

        // push it to array if it is a file
        if (stat.isFile()) return schemaFiles.push(dir)

        // read sub-files if it is a directory
        const files = yield aq.callback((cb) => fs.readdir(dir, cb))

        // filter by file name and push to array of parsing files
        return files.
          filter((file) => !file.startsWith('.')).
          filter((file) => file.endsWith('.json') || file.endsWith('.js')).
          map((file) => `${dir}/${file}`).
          forEach((file) => schemaFiles.push(file))
      })

      try {
        // read all schema files in definition folder
        yield aq.parallel(
          config.
            get('schemas').
            map((file) => `${base}/${file}`).
            map((file) => parseFolder(file))
        )

        // return empty schemas if there is no file
        if (schemaFiles.length === 0) {
          return new Schemas()
        }

        // record every file in log
        schemaFiles.forEach((file) => {
          if (logger) logger.verbose(`found schema file: ${file}.`)
        })

        // create schemas with definition files
        const schemas = yield Schemas.parse(schemaFiles)

        // bind schemas to application context
        if (app.context) {
          app.context.schemas = schemas
        }

        // output info to logger
        if (logger) logger.verbose('parsed all schemas.')

        // return result
        return schemas
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        return new Schemas()
      }
    })
  }

}

module.exports = DataApp
