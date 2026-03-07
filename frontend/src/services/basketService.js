import axios from 'axios'

const baseURL = 'http://localhost:3000/api.web'

const create = (newBasket) => {
  return axios.post(baseURL, newBasket)
}

export default {
  create
}