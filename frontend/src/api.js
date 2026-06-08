import axios from 'axios'

const apiBaseURL = window.__AI_MCODE_API_BASE__ || 'http://127.0.0.1:3018/api'

const api = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

export default api
