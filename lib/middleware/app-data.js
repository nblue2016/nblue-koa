const fs = require('fs')
const nblue = require('nblue-core')
const ndata = require('nblue-data')
const SuperApp = require('./app-super')

const aq = nblue.aq
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

class DataApp extends SuperApp {

  koa () {
    const that = this
    const nkoa = that.Nkoa
    const keys = nkoa.Keys
    const config = that.Config
    const logger = that.Logger

    return function *(next) {
      // get instance of context
      const ctx = this

      try {
        // try to get connections from context
        let
          conns = nkoa.getObject(ctx, keys.Connections),
          newInstance = false

        // create if connections wasn't found
        if (!conns) {
          // create new instance of connections
          conns = that.createConnections({ schemas: that.Schemas })
          newInstance = true
        }

        // register connections by config file
        conns.createByConfigs(config)

        // bind connections to context
        if (newInstance) nkoa.setObject(ctx, keys.Connections, conns)

        // output info to logger
        if (logger) logger.verbose('created db connections.')

        return yield next
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }

        // create empty object
        nkoa.setObject(ctx, keys.Connections, null)

        return null
      }
    }
  }

  createConnections (options) {
    // assign this to that
    const that = this
    const opts = options || {}

    // create empty schema if can't find it in context
    const schemas = opts.schema || that.Schemas

    // get instance of config
    // const config = opts.config || that.Config

    // create new instance of db connections
    const conns = new DbConnections(schemas)

    // return connections
    return conns
  }

  static parseSchemas (nkoa, options) {
    const app = nkoa.Application
    const opts = options || {}

    const config = opts.config
    const logger = opts.logger
    const settings = config.Settings

    return co(function *() {
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

        // return empty schema
        return new Schemas()
      }
    })
  }

}

module.exports = DataApp
