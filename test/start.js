// const core = require('nblue-core')
const NKoa = require('../lib')

new NKoa().start({
  configFile: `${process.cwd()}/test/config.yml`
})
