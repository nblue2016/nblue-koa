const core = require('nblue-core')
const UUID = core.UUID
const C = console

for (let i = 0; i < 10; i++) {
  C.log(`uuid: ${UUID.generate()}`)
}
