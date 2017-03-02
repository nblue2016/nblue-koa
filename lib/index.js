const nkoa = require('./nkoa')

module.exports = {
  NKoa: nkoa,
  Component: require('./components/super'),
  Controller: require('./controllers/super')
}
