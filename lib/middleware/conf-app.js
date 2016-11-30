const nblue = require('nblue')
const co = nblue.co
const ConfigMap = nblue.ConfigMap

class ConfigApp {

  static create (file, options) {
    const opts = options || {}
    const app = opts ? opts.app : null

    if (!opts.envs) {
      opts.envs = []

      // append envirnment name to array
      const appendEnv = (env) => {
        const envs = opts.envs

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

      {
        const envsArg = '--env='
        // support arguments like --envs=dev,qa

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
      }
    }

    return co(function *() {
      let config = null

      if (opts.envs &&
          Array.isArray(opts.envs) &&
          opts.envs.length === 0) {
        config = yield ConfigMap.parseConfig(file)
      } else {
        config = yield ConfigMap.parseConfig(file, opts.envs)
      }

      return config
    })
  }

}

module.exports = ConfigApp
