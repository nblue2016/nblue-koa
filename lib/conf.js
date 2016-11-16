const nblue = require('nblue')
const ConfigMap = nblue.ConfigMap

const getEnvs = (appEnvs) => {
  const args = process.argv
  const envsArg = '--env='
  const envs = []

  // append envirnment name to array
  const appendEnv = (env) => {
    let name = null

    switch (env) {
    case 'development':
      name = 'dev'
      break
    case 'production':
      name = 'prod'
      break
    default:
      name = env
      break
    }
    if (!envs.includes(name)) envs.push(name)
  }

  if (appEnvs) {
    if (Array.isArray(appEnvs)) {
      args.forEach((appEnv) => appendEnv(appEnv))
    } else {
      appendEnv(appEnvs)
    }
  }

  // parse arguments of envirnment
  if (args.includes('--debug')) appendEnv('debug')
  if (args.includes('--release')) appendEnv('release')

  // support arguments like --envs=dev,qa
  args.
    filter((val) => val.startsWith(envsArg)).
    forEach((val) => {
      const index = val.indexOf(envsArg)
      const env = val.substring(index + envsArg.length)

      if (env.indexOf(',' >= 0)) {
        env.split(',', -1).
          forEach((item) => appendEnv(item.trim()))
      } else {
        appendEnv(env)
      }
    })

  /* parse envirnment variants
  if(process.env.NODE_ENV){
    const env = process.env.NODE_ENV

    if (env.indexOf(',' >= 0)){
      env.split(',', -1).
        forEach((item) => appendEnv(item.trim()))
    } else {
      appendEnv(env)
    }
  }
  */

  return envs
}

// set export function
module.exports = (file, options) => {
  const opts = options || {}
  const app = opts ? opts.app : null

  if (!opts.envs) {
    opts.envs = getEnvs(
      app && app.env ? app.env : null
    )
  }

  if (opts.envs &&
      Array.isArray(opts.envs) &&
      opts.envs.length === 0) {
    return ConfigMap.parseConfig(file)
  }

  return ConfigMap.parseConfig(file, opts.envs)
}
