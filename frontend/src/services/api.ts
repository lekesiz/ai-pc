import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth token management
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await api.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        })

        const { access_token, refresh_token: newRefreshToken } = response.data
        
        // Update tokens
        localStorage.setItem('refresh_token', newRefreshToken)
        setAuthToken(access_token)

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, logout user
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.')
    } else if (error.response?.data?.detail) {
      toast.error(error.response.data.detail)
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)