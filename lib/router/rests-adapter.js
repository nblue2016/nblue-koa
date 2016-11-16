const Adapter = require('./adapter')

class restsAdapter extends Adapter
{

  constructor (options) {
    super(options)

    this._test = 'ok'
  }

}

module.exports = restsAdapter
