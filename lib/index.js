// const nkoa = require('./nkoa')
module.exports = {
  Koa: require('./koa'),
  Express: require('./express'),
  Component: require('./components/super'),
  LoggerComponent: require('./components/logger'),
  Controller: require('./controllers/super')
}
