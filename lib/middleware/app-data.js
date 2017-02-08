const fs = require('fs')
const nblue = require('nblue-core')
const ndata = require('nblue-data')
const SuperApp = require('./app-super')

const aq = nblue.aq
const betch = nblue.betch
const co = nblue.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

const CONFIG_KEY_OF_DATABASE = 'database'
const CONFIG_KEY_OF_CONNECTIONS = 'connections'
const CONFIG_KEY_OF_PROXIES = 'proxies'

class DataApp extends SuperApp {

  constructor (nkoa) {
    // call super constructors
    super(nkoa)

    // init variants
    this._schemas = new Schemas()

    this._csMap = new Map()
    this._proxyMap = new Map()
  }

  get Schemas () {
    return this._schemas
  }

  create () {
    // assign this to that
    const that = this

    // get instance of config, settings and logger
    const config = that.Config
    const logger = that.Logger

    const gen = function *() {
      // parse config file to generate connections and proxies
      yield that.parseConfig(config)

      // generate all file name of schemas
      const files = yield that.generateFiles(config)

      // ready for parsing if found schema files
      if (files.length > 0) {
        // fetch all files and append name to logger
        for (const file of files) {
          if (logger) logger.verbose(`found schema file: ${file}.`)
        }

        try {
          // parse schemas by array of file names
          this._schemas = yield Schemas.parse(files)

          // append verbose info to logger
          if (logger) logger.verbose('all files were parsed.')
        } catch (err) {
          // append error info to logger if parse failed
          if (logger) {
            logger.error(
              `parse schema files failed, details: ${err.message}`
            )
          }
        }
      }
    }

    return co(gen.bind(that))
  }

  parseConfig (config) {
    // check database section in config
    if (config.has(CONFIG_KEY_OF_DATABASE)) {
      // get database section from config
      const dbSection = config.get(CONFIG_KEY_OF_DATABASE)

      // check connections section in db section
      if (dbSection.has(CONFIG_KEY_OF_CONNECTIONS)) {
        // get definition for connections
        const csMap = dbSection.get(CONFIG_KEY_OF_CONNECTIONS)

        // fetch every name and connection string in map
        for (const [name, cs] of csMap) {
          // register connections
          this.registerConnectionString(name, cs)
        }
      }

      // check proxies section in db section
      if (dbSection.has(CONFIG_KEY_OF_PROXIES)) {
        // fetch all proxies that defined in config
        this.registerProxy()
      }
    }

    return Promise.resolve(0)
  }

  generateFiles (config) {
    // get base folder for schemas
    const base = config.Settings.get('base', process.cwd())

    // define function to parse schemas that placed in named folder
    const parseFolder = (dir) => co(function *() {
      // check stats of dir
      const stat = yield aq.statFile(dir)

      // push it to array if it is a file
      if (stat.isFile()) return [dir]

      // read sub-files if it is a directory
      const files = yield aq.callback((cb) => fs.readdir(dir, cb))

      // filter by file name and push to array of parsing files
      return files.
        filter((file) => !file.startsWith('.')).
        filter((file) => file.endsWith('.json') || file.endsWith('.js')).
        map((file) => `${dir}/${file}`)
    })

    return co(function *() {
      // create new array of schema files
      const schemaFiles = []

      yield betch(
        config.
          get('schemas').
          map((file) => `${base}/${file}`).
          map((file) => parseFolder(file))
        ).
        each(
          (files) => files.forEach((file) => schemaFiles.push(file))
        )

      // return array of files
      return schemaFiles
    })
  }

  getConnectoinStringByName (name) {
    const config = this.Config

    // check database section in config
    if (config.has(CONFIG_KEY_OF_DATABASE)) {
      // get database section from config
      const dbSection = config.get(CONFIG_KEY_OF_DATABASE)

      // check connections section
      if (dbSection.has(CONFIG_KEY_OF_CONNECTIONS)) {
        // get definition for connections
        const csMap = dbSection.get(CONFIG_KEY_OF_CONNECTIONS)

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

    // if the name of connection string was registered
    if (csName && this._csMap.has(csName)) {
      // only register named connection string
      conns.registerConnection(csName, this._csMap.get(csName))
    } else {
      // register all connection strings
      for (const [name, cs] of this._csMap) {
        if (cs) conns.registerConnection(name, cs)
      }
    }

    // register proxy

    // return connections
    return conns
  }

  execute (name, caller) {
    // assign this to that
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
