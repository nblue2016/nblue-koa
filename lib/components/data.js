// use libraries
const fs = require('fs')
const core = require('nblue-core')
const ndata = require('nblue-data')

// use class
const Component = require('./super')

const aq = core.aq
const betch = core.betch
const co = core.co
const ConfigMap = core.ConfigMap
const Schemas = ndata.Schemas
const DbConnections = ndata.DbConnections

// define constants
const COMPONENT_NAME = 'data'
const CONFIG_KEY_OF_DATABASE = 'database'
const CONFIG_KEY_OF_CONNECTIONS = 'connections'
const CONFIG_KEY_OF_PROXIES = 'proxies'

const EMPTY_DATABASE_NAME = ''
const EMPTY_CONNECTION_STRING = ''

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
    this._dbConfig = new ConfigMap()
  }

  get Schemas () {
    return this._schemas
  }

  get DatabaseConfig () {
    return this._dbConfig
  }

  get ConnectionStringsConfig () {
    return this.getConfigSection(
      this.DatabaseConfig,
      CONFIG_KEY_OF_CONNECTIONS
    )
  }

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

  getConfig () {
    return this._useGlobalConfig === true ? this.AppConfig : this.Config
  }

  initialize (options) {
    const opts = options || {}

    super.initialize(options)

    this._useGlobalConfig = opts.global !== false
  }

  create (options) {
    // assign options to opts
    const opts = options || {}

    // define create function from super class
    const createFunc = super.create.bind(this)

    // create generator function
    const gen = function *() {
      // invoke create method in super class
      yield createFunc(opts)

      // get instance of config
      const config = this.getConfig()

      // get instance of logger
      const logger = this.getLogger()

      // parse config file to generate connections and proxies
      yield this.parseConfig(config)

      // merge database section from web config and component config
      for (const item of [this.AppConfig, this.Config]) {
        this._dbConfig.merge(
          this.getConfigSection(item, CONFIG_KEY_OF_DATABASE)
        )
      }

      // get schemas definition folders from config
      const schemas = opts.schemas || (config.get('schemas') || [])

      // get base folder for schemas
      const base = opts.base
        ? opts.base
        : config.Settings.get('base', process.cwd())

      // generate all file name of schemas
      const files = yield this.generateSchemaFiles(schemas, base)

      // ready for parsing if found schema files
      if (files.length > 0) {
        // fetch all files and append name to logger
        for (const file of files) {
          // append file name to logger
          if (logger) {
            logger.verbose(`found schema file: ${file}.`)
          }
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
              `parse schema files failed, details: ${err.message}`,
              err
            )
          }
        }
      }
    }

    // execute gen function
    return co(gen.bind(this))
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

    // return a promise
    return Promise.resolve()
  }

  generateSchemaFiles (schemas, base) {
    // check for arguments
    if (!schemas) return Promise.resolve()

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

    const folders = Array.isArray(schemas) ? schemas : [schemas]

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

  registerConnectionString (name, cs) {
    // get instance of logger
    const logger = this.getLogger()

    // save it to connection string cache
    this._csMap.set(name, cs)

    // append the connection string name to logger
    if (logger) {
      logger.verbose(`register connection string for ${name}`)
    }
  }

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

  registerProxy () {
    // keep this method that will use in the future
    return
  }

  appendProxies () {
    // keep this method that will use in the future
    return
  }

  getDatabase (options) {
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

  getEntity (name, map) {
    const apply = this.apply.bind(this)
    const mapFunc = map ? map : (data) => data

    const mapOne = (data) => {
      if (data && typeof data.toObject === 'function') {
        return data.toObject()
      }

      return data
    }

    // return new object with name and methods
    return {
      name,
      apply: (method, ... args) => apply(name, method, ... args),
      findOne: (filter) =>
        apply(name, 'retrieve', filter, { method: 'findOne' }).
        then((data) => mapOne(data)).
        then((data) => mapFunc(data)),
      create:
        (body) => apply(name, 'create', body).
        then((data) => mapOne(data)).
        then((data) => mapFunc(data))
    }
  }

  createConnections (options) {
    // assign this to that
    const opts = options || {}

    // create empty schema if can't find it in context
    const schemas = opts.schemas || this.Schemas

    // get database connection string name with options
    const dbName = this.getDatabase(opts)

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
