const core = require('nblue-core')
const UUID = core.UUID

for (let i = 0; i < 10; i++) {
  console.log(`uuid: ${UUID.generate()}`)
}
