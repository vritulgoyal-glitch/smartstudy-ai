import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API error:', err?.response?.data || err.message)
    return Promise.reject(err)
  }
)

export const tasksApi = {
  list: () => api.get('/api/tasks').then(r => r.data),
  create: (data) => api.post('/api/tasks', data).then(r => r.data),
  update: (id, data) => api.put(`/api/tasks/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/api/tasks/${id}`).then(r => r.data),
  complete: (id) => api.post(`/api/tasks/${id}/complete`).then(r => r.data),
  prioritize: () => api.post('/api/tasks/prioritize').then(r => r.data),
  fromVoice: (transcript) => api.post('/api/tasks/voice', { transcript }).then(r => r.data),
}

export const plannerApi = {
  generate: (available_hours, plan_type = 'daily') =>
    api.post('/api/planner/generate', { available_hours, plan_type }).then(r => r.data),
  current: () => api.get('/api/planner/current').then(r => r.data),
  reschedule: () => api.post('/api/planner/reschedule').then(r => r.data),
}

export const aiApi = {
  dailyBrief: () => api.get('/api/ai/daily-brief').then(r => r.data),
  chat: (message, session_id) => api.post('/api/ai/chat', { message, session_id }).then(r => r.data),
  history: (session_id) => api.get('/api/ai/chat/history', { params: { session_id } }).then(r => r.data),
  clearHistory: () => api.delete('/api/ai/chat/history').then(r => r.data),
}

export const usersApi = {
  me: () => api.get('/api/users/me').then(r => r.data),
  update: (data) => api.put('/api/users/me', data).then(r => r.data),
  stats: () => api.get('/api/users/stats').then(r => r.data),
}

export default api
