const fs = require('fs')
const nblue = require('nblue-core')
const ndata = require('nblue-data')
const SuperApp = require('./app-super')

const aq = nblue.aq
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

const KEY_OF_DATABASE = 'database'
const KEY_OF_CONNECTIONS = 'connections'
const KEY_OF_PROXIES = 'proxies'

class DataApp extends SuperApp {

  constructor (nkoa) {
    super(nkoa)

    this._schemas = null
    this._csMap = new Map()
    this._proxyMap = new Map()
    this._modelMap = new Map()
  }

  get Scehmas () {
    return this._schemas
  }

  create () {
    // assign this to that
    const that = this

    const nkoa = that.Nkoa
    // const app = that.Application

    const config = that.Config
    const logger = that.Logger
    const settings = config.Settings

    return co(function *() {
      // get base folder for schemas
      const base = settings.get('base', process.cwd())

      // create new array of schema files
      const schemaFiles = []

      // define function to parse schemas that placed in named folder
      const parseFolder = (dir) => co(function *() {
        // check stats of dir
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
          this._schemas = new Schemas()
        } else {
          // append to log for every schema file
          schemaFiles.forEach((file) => {
            if (logger) logger.verbose(`found schema file: ${file}.`)
          })

          // create schemas with definition files
          this._schemas = yield Schemas.parse(schemaFiles)
        }

        // output info to logger
        if (logger) logger.verbose('parsed all schemas.')

        // save schema to global cache
        nkoa.saveToCache(nkoa.Keys.Schemas, this._schemas)
      } catch (err) {
        if (logger) {
          logger.error(`parse schemas failed, details: ${err.message}`)
        }
      }

      // check database section in config
      if (config.has(KEY_OF_DATABASE)) {
        // get database section from config
        const dbSection = config.get(KEY_OF_DATABASE)

        // check connections section in db section
        if (dbSection.has(KEY_OF_CONNECTIONS)) {
          // get definition for connections
          const csMap = dbSection.get(KEY_OF_CONNECTIONS)

          // fetch every name and connection string in map
          for (const [name, cs] of csMap) {
            // register connections
            that.registerConnectionString(name, cs)
          }
        }

        // check proxies section in db section
        if (dbSection.has(KEY_OF_PROXIES)) {
          // fetch all proxies that defined in config
          that.registerProxy()
        }
      }
    })
  }

  getConnectoinStringByName (name) {
    const config = this.Config

    // check database section in config
    if (config.has(KEY_OF_DATABASE)) {
      // get database section from config
      const dbSection = config.get(KEY_OF_DATABASE)

      // check connections section
      if (dbSection.has(KEY_OF_CONNECTIONS)) {
        // get definition for connections
        const csMap = dbSection.get(KEY_OF_CONNECTIONS)

        if (csMap.has(name)) return csMap.get(name)
      }
    }

    return null
  }

  registerConnectionString (name, cs) {
    const logger = this.Logger

    this._csMap.set(name, cs)

    if (logger) {
      logger.verbose(`register connection string for ${name}`)
    }
  }

  registerProxy () {
    return
  }

  createConnections (options) {
    // assign this to that
    const opts = options || {}

    // create empty schema if can't find it in context
    const schemas = opts.schemas || this.Schemas

    // create new instance of db connections
    const conns = new DbConnections(schemas)

    // register connection strings
    const csName = opts.csName || null

    if (csName && this._csMap.has(csName)) {
      // only register named connection string
      conns.registerConnection(csName, this._csMap.get(csName))
    } else {
      // register all connection strings
      for (const [name, cs] of this._csMap) {
        conns.registerConnection(name, cs)
      }
    }

    // register proxy

    // return connections
    return conns
  }

  execute (name, caller) {
    const that = this

    return co(function *() {
      // declare options for connections
      const opts = {}

      // append model name to options if it was declared
      if (name) opts.csName = name

      // get instance of connections with options
      const conns = that.createConnections(opts)

      // get instance of connection by model name
      const conn = conns.getConnectionByEntity(name)

      // open connection
      yield conn.open()

      try {
        // get items by scope name from database
        const adapter = yield conns.getAdapter(name)

        // call command and return result
        return yield caller(adapter)
      } finally {
        // close connection
        yield conn.close()
      }
    })
  }

}

module.exports = DataApp
