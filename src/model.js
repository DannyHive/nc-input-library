var axios = require('axios')
var log = require('../lib/logger')

var Promise = require('bluebird')

const TAG = 'Model'
class Model {
  getRequest (url, networkTimeout) {
    log.debug(TAG, `getRequest(): url=${url} networkTimeout=${networkTimeout}`)
    return new Promise((resolve, reject) => {
      axios.get(url, {timeout: networkTimeout}).then(resp => {
        resolve(resp.data)
      }).catch(err => {
        if (err.response) {
          log.error(TAG, `apiGET(): url=${url} ` +
            `err.response.status=${err.response.status} ` +
            `err.response.statusText=${(err.response.statusText)} err.response.data=${(JSON.stringify(err.response.data))})`)
          resolve({status: false, errCode: err.response.status, errMessage: err.response.statusText, errData: err.response.data})
        } else {
          reject(err)
        }
      })
    })
  }

  submitData (url, payload, networkTimeout) {
    log.debug(TAG, `apiPOST(): url=${url} payload=${JSON.stringify(payload)} networkTimeout=${networkTimeout}`)
    return new Promise((resolve, reject) => {
      axios.post(url, payload, {timeout: networkTimeout}).then(resp => {
        resolve(resp.data)
      }).catch(err => {
        if (err.response) {
          log.error(TAG, `submitData(): url=${url} ` +
            `payload=${JSON.stringify(payload)} err.response.status=${err.response.status} ` +
            `err.response.statusText=${(err.response.statusText)} err.response.data=${(JSON.stringify(err.response.data))})`)
          resolve({status: false, errCode: err.response.status, errMessage: err.response.statusText, errData: err.response.data})
        } else {
          reject(err)
        }
      })
    })
  }
}

module.exports = Model
