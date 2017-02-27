// const core = require('nblue-core')
const NKoa = require('../lib').NKoa

new NKoa().start({
  configFile: `${process.cwd()}/test/config.yml`
})
