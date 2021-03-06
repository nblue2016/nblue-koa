// use libraries
const fs = require('fs')
const core = require('nblue-core')
const ndata = require('nblue-data')

// use class
const Component = require('./super')

const aq = core.aq
const betch = core.betch
const co = core.co
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

// define constants
const COMPONENT_NAME = 'data'
const CONFIG_KEY_OF_DATABASE = 'database'
const CONFIG_KEY_OF_CONNECTIONS = 'connections'
const CONFIG_KEY_OF_CONNECTION = 'connection'
const CONFIG_KEY_OF_PROXIES = 'proxies'

const EMPTY_DATABASE_NAME = ''
const EMPTY_CONNECTION_STRING = ''
const DEFAULT_DATABASE_NAME = 'db'

class DataComponent extends Component {

  constructor (nblue, options) {
    // assign options to opts
    const opts = options || {}

    // append component name to options
    if (!opts.name) opts.name = COMPONENT_NAME

    // call super constructors
    super(nblue, opts)

    // init variants
    this._schemas = new Schemas()
    this._csMap = new Map()
    this._proxyMap = new Map()
  }

  get Schemas () {
    return this._schemas
  }

  // the method returns an array of needed package's name
  getPackages (options) {
    // assign options to opts
    const opts = options || {}

    // get default proxies
    const proxies = new Map()

    // define function to get protocol name
    const getProtocolName = (protocol) => {
      if (protocol.endsWith(':')) return protocol

      return `${protocol}:`
    }

    // fetch every
    for (const [protocol, proxy] of DbConnections.getDefaultProxies()) {
      proxies.set(getProtocolName(protocol), proxy)
    }

    // append custome proxies to options, it will overwrite defaults
    if (this._proxyMap.size > 0) {
      for (const [protocol, proxy] of this._proxyMap) {
        proxies.set(getProtocolName(protocol), proxy)
      }
    }

    // append proxies to options
    opts.proxies = proxies

    try {
      // get packages that data connections need
      return DbConnections.getPackages(opts)
    } catch (err) {
      return []
    }
  }

  // the method will be called by super class when creating component
  _create (options) {
    // assign options to opts
    const opts = options || {}

    // ignore if lazy loading is true
    if (opts.lazy === true) return Promise.resolve()

    // create generator function
    const gen = function *() {
      // get instance of config
      const config = opts.config ? opts.config : this.AppConfig

      // parse config file to register connections and proxies
      yield this.parseConfig(config)

      // append schemas to current cache
      yield this.appendSchemas(config, opts)
    }

    // execute gen function
    return co(gen.bind(this))
  }

  // the method parses config to get connection settings
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

    // return a promise
    return Promise.resolve()
  }

  // the method appends entity models to data component's schemas
  appendSchemas (config, options) {
    // assign options to opts
    const opts = options || {}

    // get schemas definition folders from current config
    const source = opts.schemas || (config ? config.get('schemas') : [])

    // define function for append schemas
    const appendFunc = this.appendSchemas.bind(this)

    // if schemas is an array, fetch every item
    if (Array.isArray(source)) {
      // exit if source is empty array
      if (source.length === 0) return Promise.resolve()

      // process all item in source
      return Promise.all(source.map(
        (item) => appendFunc(config, { schemas: item })
      ))
    }

    // get instance of logger
    const logger = this.getLogger()

    // get instance of current data schemas
    const schemas = this.Schemas

    // parse schemas by file or directory
    if (typeof source === 'string') {
      // create generator function
      const gen = function *() {
        // get base folder for schemas
        const base = this.getBaseFolder(opts)

        // generate all file name of schemas
        const files = yield this.generateSchemaFiles(source, base)

        // ready for parsing if found schema files
        if (files.length === 0) return

        // fetch every file in files
        for (const file of files) {
          // logged schema file
          if (logger) logger.verbose(`found schema file: ${file}.`)

          try {
            // read data schema from file
            yield schemas.readFile(file)

            // logged parsed file
            if (logger) logger.verbose(`parsed schema file: ${file}.`)
          } catch (err) {
            // append error to logger
            if (logger) {
              logger.error(
                `parse schema files failed, details: ${err.message}`,
                err
              )
            }

            // ignore curent file and parse next
            continue
          }
        }
      }

      // invoke generator function
      return co(gen.bind(this))
    } else if (typeof source === 'object') {
      // parse schemas by data model
      return aq.then(schemas.parseSchemas(source))
    }

    // return empty promise
    return Promise.resolve()
  }

  // the method generates model schemas file on base folder
  generateSchemaFiles (source, base) {
    // check for arguments
    if (!source) return Promise.resolve()

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

    // get array of schema folders
    const folders = Array.isArray(source) ? source : [source]

    // merge files from different folder to one array
    return betch(
      folders.
        map((file) => `${base}/${file}`).
        map((file) => parseFolder(file))
      ).
      then(
        (files) => files.reduce((a, b) => a.concat(b), [])
      )
  }

  // the method will returns connection string by name that defined in config
  getConnectoinStringByName (name) {
    // return connection string if found it in cache
    if (this._csMap.has(name)) {
      return this._csMap.get(name)
    }

    // found it from config
    const config = this.ConnectionStringsConfig

    // return connection string if it was found by name
    return config.has(name) ? config.get(name) : EMPTY_CONNECTION_STRING
  }

  // the method only returns connection string from config with options
  getConnectoinStringWithOptions (options) {
    // assign options to opts
    const opts = options || {}

    // declare
    let
      cs = null,
      // get database name from options
      name = opts.name || DEFAULT_DATABASE_NAME

    // get instance of config
    const config = opts.config || this.Config

    // get database section from config
    const section = config.get(CONFIG_KEY_OF_DATABASE)

    // try to find connection string from connection section in config
    if (section && section.has(CONFIG_KEY_OF_CONNECTIONS)) {
      // get connection value from section
      cs = section.get(CONFIG_KEY_OF_CONNECTION)

      // connection with optiosn, return it directly
      if (typeof cs === 'object') return cs
      else if (typeof cs === 'string') {
        // if value is a connection string, return it
        if (cs.indexOf('://') > 0) return cs

        // otherwise use the value as database name
        name = cs
      } else {
        throw new Error(`invaild type for connection`)
      }
    }

    // try to find database by name in application config
    // get database section from application config
    const dbSection = this.AppConfig.get(CONFIG_KEY_OF_DATABASE)

    // try to find connections section from database section
    if (dbSection && dbSection.has(CONFIG_KEY_OF_CONNECTIONS)) {
      const csSection = dbSection.get(CONFIG_KEY_OF_CONNECTIONS)

      // try to find connection by name in connections section
      if (csSection && csSection.has(name)) {
        return csSection.get(name)
      }
    }

    throw new Error(`Can't find connection string for current component.`)
  }

  // the method register connection string to cache
  registerConnectionString (name, cs) {
    // get instance of logger
    const logger = this.getLogger()

    // save it to connection string cache
    this._csMap.set(name, cs)

    // append the connection string name to logger
    if (logger) {
      logger.verbose(`register connection string for ${name} with ${cs}`)
    }
  }

  registerConnectionByConfig (name, config) {
    // check for arguments
    if (!name) throw new ReferenceError('name')
    if (!config) throw new ReferenceError('config')

    // get database section from config
    if (config.has(CONFIG_KEY_OF_DATABASE)) {
      const dbSection = config.get(CONFIG_KEY_OF_DATABASE)

      // get connection section from database section
      if (dbSection.has(CONFIG_KEY_OF_CONNECTION)) {
        const cs = dbSection.get(CONFIG_KEY_OF_CONNECTION)

        if (cs) this.registerConnectionString(name, cs)
      }
    }
  }

  // the method register connection to cache
  registerConnection (conns, name, cs) {
    const logger = this.getLogger()

    try {
      if (!conns.support(cs)) {
        // append warning to logger
        if (logger) {
          logger.warning(`connection doesn't support for ${cs}.`)
        }

        // exit
        return
      }

      conns.registerConnection(name, cs)
    } catch (err) {
      // append error to logger
      if (logger) {
        logger.error(`register connection failed for cs:${cs}.`, err)
      }
    }
  }

  // the method register database proxy to cache
  // it will be used in future
  registerProxy () {
    // keep this method that will use in the future
    return
  }

  // the append orm proxies
  // it will be used in future
  appendProxies () {
    // keep this method that will use in the future
    return
  }

  // the method returns new instance of connections that defined in config
  createConnections (options) {
    // assign this to that
    const opts = options || {}

    // create empty schema if can't find it in context
    const schemas = opts.schemas || this.Schemas

    // get database connection string name with options
    const dbName = this.getDatabaseName(opts)

    // create new instance of db connections
    const conns = new DbConnections(schemas)

    // append proxies for custom proxies
    this.appendProxies()

    // register all connection if there is no database name
    if (!dbName) {
      // empty it will register all connections in config
      for (const [name, cs] of this._csMap) {
        // register to connections with name and connection string
        this.registerConnection(conns, name, cs)
      }
    } else if (dbName && this._csMap.has(dbName)) {
      // get connection string by database name
      const cs = this._csMap.get(dbName)

      // if the name of connection exists and has connection string
      // only register named connection string
      this.registerConnection(conns, dbName, cs)
    } else {
      // get instance of logger
      const logger = this.getLogger()

      if (logger) {
        logger.warning(`can't find connection string by name:${dbName}`)
      }
    }

    // return connections
    return conns
  }

  // the method returns database name with options
  getDatabaseName (options) {
    // assign options to opts
    const opts = options || {}

    // create empty schema if can't find it in context
    const schemas = opts.schemas || this.Schemas

    // get model name from options
    const model = opts.model || null

    try {
      // check model
      if (!model) throw new Error('empty model')

      // get schema by model name
      const schema = schemas.Schema(model)

      // throw error if can't find schema by model
      if (!schema) {
        throw new Error(`can't find schema by model name: ${model}`)
      }

      // return database that defined in schema
      return schema.database ? schema.database : EMPTY_DATABASE_NAME
    } catch (err) {
      // get instance of logger
      const logger = this.getLogger()

      // append error message to logger
      if (logger) logger.error(err.message, err)

      // return empty database name
      return EMPTY_DATABASE_NAME
    }
  }

  // the method returns an object with database operations by entity name
  getDatabase (name, map) {
    // get function for apply command in database
    const applyFunc = this.apply.bind(this)

    // get map function between database and entity
    const mapFunc = map ? map : (data) => data

    // get function for convert object from database to entity
    const convertFunc = (data) => {
      // call toObject method if entity has it
      if (data && typeof data.toObject === 'function') {
        return data.toObject()
      }

      // return data directly
      return data
    }

    const findOneOpts = { method: 'findOne' }

    // return new object with name and methods
    return {
      name,
      apply: (method, ... args) => applyFunc(name, method, ... args),
      findOne: (filter) => applyFunc(name, 'retrieve', filter, findOneOpts).
                            then((data) => convertFunc(data)).
                            then((data) => mapFunc(data)),
      find: (filter) => applyFunc(name, 'retrieve', filter).
                          then((data) => convertFunc(data)).
                          then((data) => mapFunc(data)),
      create: (body) => applyFunc(name, 'create', body).
                          then((data) => convertFunc(data)).
                          then((data) => mapFunc(data)),
      del: (id) => applyFunc(name, 'delete', id)
    }
  }

  execute (name, caller) {
    // define function to create connections
    const createConns = this.createConnections.bind(this)

    return co(function *() {
      // declare options for connections
      const opts = {}

      // append model name to options if it was declared
      if (name) opts.model = name

      // get instance of connections with options
      const conns = createConns(opts)

      // get instance of connection by model name
      const conn = conns.getConnectionByModel(name)

      try {
        // open connection
        yield conn.open()
      } catch (err) {
        // call error result
        return yield caller(err, null)
      }

      try {
        // get items by scope name from database
        const adapter = yield conns.getAdapter(name)

        // throw error if can't find adapter by name
        if (adapter === null) {
          throw new Error(`can't find adapter by ${name}`)
        }

        // call command and return result
        return yield caller(null, adapter)
      } catch (err) {
        // call error result
        return yield caller(err, null)
      } finally {
        // close connection
        yield conn.close()
      }
    })
  }

  pexecute (name, invoke) {
    // create caller function for execute
    const caller = (err, adapter) => {
      // reject error
      if (err) return Promise.reject(err)

      // call invoke function
      return invoke(adapter)
    }

    // return result
    return this.execute(name, caller)
  }

  apply (name, method, ... args) {
    // define function for apply
    const func = method || 'retrieve'

    // execute a methed of adpater
    return this.pexecute(name, (adapter) => adapter[func](... args))
  }

  one (obj) {
    // return null if object is false
    if (!obj) return null

    // convert array to normal object
    if (Array.isArray(obj)) {
      return obj.length === 0 ? null : obj[0]
    }

    // return current object
    return obj
  }

}

module.exports = DataComponent
