// const path = require('path')
const fs = require('fs')
const nblue = require('nblue')
const ndata = require('nblue-data')

const aq = nblue.aq
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

const create = function (app) {
  return co(function *() {
    const ctx = app.context
    const config = ctx.config
    const settings = ctx.settings
    const logger = ctx.logger

    // create new array of schema files
    const files = []

    const base = settings.has('base') ? settings.get('base') : process.cwd()
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

      // output info to logger
      if (logger) logger.verbose('parsed schemas files.')

      // create new instance of db connections
      const conns = new DbConnections(schemas)

      // register proxies
      // console.log(conns)

      // create connection by config
      conns.createByConfigs(config)

      // bind connections to context
      app.context.conns = conns

      // output info to logger
      if (logger) logger.verbose('created db connections.')

      return conns
    } catch (err) {
      if (logger) {
        logger.error(`parse schemas failed, details: ${err.message}`)
      }

      return null
    }
  })
}

const koa = function () {
  return function *(next) {
    // exit if connections has been created
    if (this.conns) return yield next

    const ctx = this
    const app = ctx.app
    const config = ctx.config
    const settings = ctx.settings
    const logger = ctx.logger

    // exit if can't find instance of configuration
    if (!config) return yield next

    // create new array of schema files
    const files = []

    const base = settings.has('base') ? settings.get('base') : process.cwd()
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

      // app.context.schemas = schemas

      // output info to logger
      if (logger) logger.verbose('parsed schemas files.')

      // create new instance of db connections
      const conns = new DbConnections(schemas)

      // register proxies
      // console.log(conns)

      // create connection by config
      conns.createByConfigs(config)

      // bind connections to context
      app.context.conns = conns

      // output info to logger
      if (logger) logger.verbose('created db connections.')
    } catch (err) {
      if (logger) {
        logger.error(`parse schemas failed, details: ${err.message}`)
      }

      // create empty object
      app.context.conns = { }
    }

    return yield next
  }
}

module.exports = {
  create,
  koa
}
