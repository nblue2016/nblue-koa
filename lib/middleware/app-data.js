const fs = require('fs')
const core = require('nblue-core')
const data = require('nblue-data')
const SuperApp = require('./app-super')

const aq = core.aq
const betch = core.betch
const co = core.co

const Schemas = data.Schemas
const DbConnections = data.DbConnections

const CONFIG_KEY_OF_DATABASE = 'database'
const CONFIG_KEY_OF_CONNECTIONS = 'connections'
const CONFIG_KEY_OF_PROXIES = 'proxies'

class DataApp extends SuperApp {

  constructor (napp) {
    // call super constructors
    super(napp)

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
    const config = this.WebConfig
    const logger = this.Logger

    const gen = function *() {
      // parse config file to generate connections and proxies
      yield that.parseConfig(config)

      // generate all file name of schemas
      const files = yield that.generateSchemaFiles(config)

      // ready for parsing if found schema files
      if (files.length > 0) {
        // fetch all files and append name to logger
        for (const file of files) {
          // append file name to logger
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

  generateSchemaFiles (config) {
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

    // merge files from different folder to one array
    return betch(
      config.
        get('schemas').
        map((file) => `${base}/${file}`).
        map((file) => parseFolder(file))
      ).
      then(
        (files) => files.reduce((a, b) => a.concat(b), [])
      )
  }

  getConnectoinStringByName (name) {
    // get instance of config
    const config = this.WebConfig

    // check database section in config
    if (config.has(CONFIG_KEY_OF_DATABASE)) {
      // get database section from config
      const dbSection = config.get(CONFIG_KEY_OF_DATABASE)

      // check connections section
      if (dbSection.has(CONFIG_KEY_OF_CONNECTIONS)) {
        // get definition for connections
        const csMap = dbSection.get(CONFIG_KEY_OF_CONNECTIONS)

        // return connection string if it was found by name
        if (csMap.has(name)) return csMap.get(name)
      }
    }

    // return null if doesn't find it
    return null
  }

  registerConnectionString (name, cs) {
    // get instance of logger
    const logger = this.Logger

    // save it to connection string cache
    this._csMap.set(name, cs)

    // append the connection string name to logger
    if (logger) {
      logger.verbose(`register connection string for ${name}`)
    }
  }

  registerProxy () {
    // keep this method that will use in the future
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

    // if the name of connection exists and has connection string
    if (csName && this._csMap.has(csName)) {
      // only register named connection string
      conns.registerConnection(csName, this._csMap.get(csName))
    } else {
      // fetch every item in connection string cache
      for (const [name, cs] of this._csMap) {
        // register to connections with name and connection string
        if (cs) conns.registerConnection(name, cs)
      }
    }

    // append proxies
    this.appendProxies()

    // return connections
    return conns
  }

  appendProxies () {
    // keep this method that will use in the future
    return
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
