import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 600_000,
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data
    const apiError = data?.error
    const status = error.response?.status

    let message = 'An unexpected error occurred.'
    if (apiError?.message)          message = apiError.message
    else if (error.code === 'ECONNABORTED') message = 'Request timed out.'
    else if (!error.response)       message = 'Cannot reach the server. Is the backend running?'

    const typeMessages = {
      DatasetNotLoaded: '📂 No dataset loaded — upload a file first.',
      NoActiveProject:  '📁 No active project — upload a CSV to create one.',
      NotFound:         '🔍 Resource not found.',
      ValidationError:  `⚠️ ${message}`,
      ServerError:      `🔴 Server error: ${message}`,
    }
    const toastMsg = typeMessages[apiError?.type] ?? message
    if (status !== 422 && status !== 404 && status !== 409) {
      toast.error(toastMsg, { duration: 5000 })
    }

    return Promise.reject({
      type: apiError?.type ?? 'UnknownError',
      code: status ?? 0,
      message,
      details: apiError?.details ?? {},
      raw: error,
    })
  }
)

export const healthApi = { check: () => api.get('/health') }

export const projectsApi = {
  list:   ()         => api.get('/projects'),
  active: ()         => api.get('/projects/active'),
  switch: (id)       => api.post('/projects/switch', { project_id: id }),
  delete: (id)       => api.delete(`/projects/${id}`),
}

export const uploadApi = {
  upload: (file, modelName, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    if (modelName) fd.append('model_name', modelName)
    return api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) {
          // e.total can be 0 or undefined when Content-Length is absent
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
          onProgress(pct)
        }
      },
    })
  },
}

export const dataApi = {
  get:         () => api.get('/data'),
  dropColumns: (columns) => api.delete('/data/columns', { data: { columns } }),
  reset:       () => api.post('/reset'),
}

export const featuresApi = {
  analyze: (target_column, problem_type) =>
    api.post('/features/analyze', { target_column, problem_type }),
  add:     (feature_name) => api.post('/features/add', { feature_name }),
  status:  () => api.get('/features/status'),
  cancel:  () => api.post('/features/cancel'),
}

export const exploreApi = {
  startDtale:      () => api.post('/explore/dtale'),
  generateProfile: () => api.post('/explore/profile'),
  profileStatus:   () => api.get('/explore/profile/status'),
  profileViewUrl:  () => '/api/explore/profile/view',
}

export const automlApi = {
  train:  (config) => api.post('/automl/train', config),
  status: ()       => api.get('/automl/status'),
  cancel: ()       => api.post('/automl/cancel'),
}

export const statusApi = {
  all: () => api.get('/status/all'),
}

export const sessionApi = {
  cleanup: () => api.post('/session/cleanup'),
  cleanupOnClose: () => {
    const url = '/api/session/cleanup'

    try {
      if (navigator.sendBeacon) {
        const payload = new Blob(['{}'], { type: 'application/json' })
        if (navigator.sendBeacon(url, payload)) return true
      }
    } catch {}

    try {
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      return true
    } catch {}

    return false
  },
}

export const downloadsApi = {
  status:          () => api.get('/downloads/status'),
  csvUrl:          () => '/api/download/csv',
  modelRunUrl:     (runNumber) => `/api/download/model/${runNumber}`,
  profileUrl:      () => '/api/download/profile',
  getRunModels:    (runNumber) => api.get(`/automl/run/${runNumber}/models`),
  selectiveDownloadUrl: (runNumber, selectedModels, filename) => {
    const params = new URLSearchParams()
    for (const model of selectedModels || []) params.append('selected_models', model)
    if (filename) params.set('filename', filename)
    return `/api/download/model/${runNumber}/selective?${params.toString()}`
  },
  selectiveDownload: (runNumber, selectedModels, filename) =>
    fetch(`/api/download/model/${runNumber}/selective${filename ? `?filename=${encodeURIComponent(filename)}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_models: selectedModels }),
      credentials: 'include',
    }),
}

export default api
