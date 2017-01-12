const fs = require('fs')
const nblue = require('nblue-core')
const ndata = require('nblue-data')
const SuperApp = require('./app-super')
const Context = require('.././context')

const aq = nblue.aq
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

class DataApp extends SuperApp {

  koa () {
    const that = this

    return function *(next) {
      const ctx = this
      const logger = that.Logger

      try {
        let conns = Context.getConnections(ctx)

        // ignore if connections was created

        if (conns) {
          if (logger) logger.info('connections has already been created')

          return yield next
        }

        // create new instance of connections
        conns = that.createConnections(ctx)

        // bind connections to context
        Context.setConnections(ctx, conns)

        // output info to logger
        if (logger) logger.verbose('created db connections.')
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        // create empty object
        Context.setConnections(ctx, null)
      }

      return yield next
    }
  }

  createConnections () {
    // assign this to that
    const that = this
    const config = that.Config

    // create empty schema if can't find it in context
    const schemas = that.Schemas

    // create new instance of db connections
    const conns = new DbConnections(schemas)

    // create connection by config
    conns.createByConfigs(config)

    return conns
  }

  static parseSchemas (nkoa) {
    const app = nkoa.Application
    // const ctx = app.context

    return co(function *() {
      const config = nkoa.Config
      const logger = nkoa.logger
      const settings = config.Settings

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
