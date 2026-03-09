import axios from 'axios'

const baseURL = '/api/web'

const generateEndpoint = () => {
  return axios.get(baseURL)
}

const create = (endpoint, masterToken) => {
  const headers = masterToken ? { 'master-token': masterToken } : {}
  return axios.post(`${baseURL}/${endpoint}`, {}, { headers })
}

const getRequests = (endpoint) => {
  return axios.get(`${baseURL}/${endpoint}`)
}

export default {
  generateEndpoint,
  create,
  getRequests
}
