const nblue = require('nblue-core')
const UUID = nblue.UUID

for (let i = 0; i < 10; i++) {
  console.log(`uuid: ${UUID.generate()}`)
}
