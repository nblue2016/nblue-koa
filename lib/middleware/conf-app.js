const nblue = require('nblue')
const ConfigMap = nblue.ConfigMap

const mapping = {
  development: 'dev',
  production: 'prod'
}

class ConfigApp {

  static create (file, options) {
    const opts = options || {}
    const envs = opts.envs ? opts.envs : ConfigApp.getEnvs(options)

    if (!envs) return ConfigMap.parseConfig(file)
    if (Array.isArray(envs) && envs.length === 0) {
      return ConfigMap.parseConfig(file)
    }

    return ConfigMap.parseConfig(file, envs)
  }

  static getEnvs (options) {
    const opts = options || {}
    const app = opts ? opts.app : null

    const envs = []

    // append envirnment name to array
    const appendEnv = (env) => {
      const name = mapping[env] ? mapping[env] : env

      if (!envs.includes(name)) {
        envs.push(name)
      }
    }

    const args = process.argv

    // parse envs from applciation
    if (app && app.env) {
      if (Array.isArray(app.env)) {
        app.env.
          forEach((appEnv) => appendEnv(appEnv))
      } else {
        appendEnv(app.env)
      }
    }

    // parse arguments of envirnment
    if (args.includes('--debug')) appendEnv('debug')
    if (args.includes('--release')) appendEnv('release')

    /* parse envirnment variants
    if(process.env.NODE_ENV){
      const env = process.env.NODE_ENV

      if (env.indexOf(',' >= 0)){
        env.
          split(',', -1).
          forEach((item) => appendEnv(item.trim()))
      } else {
        appendEnv(env)
      }
    }
    */

    // support arguments like --envs=dev,qa
    const envsArg = '--env='

    args.
      filter((val) => val.startsWith(envsArg)).
      forEach((val) => {
        const index = val.indexOf(envsArg)
        const env = val.substring(index + envsArg.length)

        if (env.indexOf(',' < 0)) appendEnv(env)
        else {
          env.
            split(',', -1).
            forEach((item) => appendEnv(item.trim()))
        }
      })

    return envs
  }

}

module.exports = ConfigApp
