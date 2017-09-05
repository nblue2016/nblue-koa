// reference libraries
const core = require('nblue-core')

// use classes
const Constants = require('.././constants')
const Component = require('./super')
const Cache = core.Cache

// define constants
const CACHE_KEY_OF_NBLUE = 'nblue'
const DEFAULT_EXPIRED_SECONDS = 60 * 5

class NewCache extends Cache {

  constructor (options) {
    super()

    this._options = options || {}
  }

  setItem (key, value) {
    // get options from private options
    const opts = this._options || {}

    // try to get expired from options or use default
    const expired = opts.expired || DEFAULT_EXPIRED_SECONDS * 1000

    // save item to cache
    super.setItem(key, value, expired)
  }

}

class CacheComponent extends Component {

  constructor (nblue) {
    super(nblue, { name: 'cache' })

    this._caches = null
    this._options = null
  }

  get Caches () {
    return this._caches
  }


  getCacheByName (name) {
    // get instance of caches
    const caches = this.Caches

    // get opts from private options
    const opts = this._options || {}

    if (!caches.has(name)) {
      caches.set(name, new NewCache(opts))
    }

    return caches.get(name)
  }

  create (options) {
    // assign options to private value
    this._options = options

    // create new map for caches
    this._caches = new Map()

    // get cache for nblue
    const nblueCache = this.getCacheByName(CACHE_KEY_OF_NBLUE)

    // get instance of nblue application
    const nblue = this.NBlue

    // save instance of logger to nblue application cache
    nblue.saveToCache(Constants.KeyOfCache, nblueCache)
  }

  release () {
    super.release()

    if (this._caches) {
      this._caches.clear()
      this._caches = null
    }
  }

}

module.exports = CacheComponent
