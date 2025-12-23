/**
 * Axios Request Wrapper
 * 
 * Features:
 * - Request/Response interceptors
 * - Error handling with detailed logging
 * - Token management
 * - Automatic error reporting
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { logApiError, logNetworkError } from '../utils/errorLogger'

/**
 * Create axios instance
 * Production uses relative path, development uses localhost
 */
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * Request interceptor
 * Adds authentication token and request tracking
 */
service.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for performance tracking
    config.metadata = { startTime: Date.now() }
    
    return config
  },
  (error) => {
    // Log request configuration errors
    logNetworkError({
      url: error.config?.url || 'unknown',
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      errorMessage: `Request configuration error: ${error.message}`
    })
    
    return Promise.reject(error)
  }
)

/**
 * Response interceptor
 * Handles errors and logs them for debugging
 */
service.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // Calculate request duration for performance monitoring
    const duration = response.config.metadata 
      ? Date.now() - response.config.metadata.startTime 
      : 0
    
    // Log slow requests (> 3 seconds)
    if (duration > 3000) {
      console.warn(`[API] Slow request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`)
    }
    
    // Check for API-level errors
    if (res?.success === false) {
      // Log API business logic errors
      logApiError({
        url: response.config.url,
        method: response.config.method?.toUpperCase(),
        status: response.status,
        statusText: 'Business Logic Error',
        responseData: res,
        requestData: response.config.data ? JSON.parse(response.config.data) : null
      })
      
      ElMessage.error(res.message || 'Request failed')
      return Promise.reject(new Error(res.message || 'Request failed'))
    }
    
    return res
  },
  (error) => {
    // Extract request details for logging
    const requestUrl = error.config?.url || 'unknown'
    const requestMethod = error.config?.method?.toUpperCase() || 'UNKNOWN'
    const requestData = error.config?.data ? JSON.parse(error.config.data) : null
    
    if (error.response) {
      // Server responded with an error status
      const status = error.response.status
      const statusText = error.response.statusText
      const responseData = error.response.data
      
      // Log the API error with full details
      logApiError({
        url: requestUrl,
        method: requestMethod,
        status,
        statusText,
        responseData,
        requestData
      })
      
      // Show user-friendly error messages
      switch (status) {
        case 401:
          ElMessage.error('Unauthorized, please login again')
          localStorage.removeItem('token')
          break
        case 403:
          ElMessage.error('Access denied')
          break
        case 404:
          ElMessage.error('Resource not found')
          break
        case 429:
          ElMessage.error('Too many requests, please try again later')
          break
        case 500:
          ElMessage.error('Server error, please try again later')
          break
        case 502:
        case 503:
        case 504:
          ElMessage.error('Service temporarily unavailable')
          break
        default:
          ElMessage.error(responseData?.message || `Request failed (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      logNetworkError({
        url: requestUrl,
        method: requestMethod,
        errorMessage: `Request timeout after ${error.config?.timeout}ms`
      })
      
      ElMessage.error('Request timeout, please try again')
    } else if (error.code === 'ERR_NETWORK') {
      // Network error
      logNetworkError({
        url: requestUrl,
        method: requestMethod,
        errorMessage: 'Network connection failed'
      })
      
      ElMessage.error('Network error, please check your connection')
    } else {
      // Other errors
      logNetworkError({
        url: requestUrl,
        method: requestMethod,
        errorMessage: error.message || 'Unknown error'
      })
      
      ElMessage.error('Request failed, please try again')
    }
    
    return Promise.reject(error)
  }
)

/**
 * Request method wrappers with TypeScript-like safety
 */
const request = {
  /**
   * GET request
   * @param {string} url - Request URL
   * @param {object} config - Axios config
   * @returns {Promise} Response promise
   */
  get(url, config) {
    return service.get(url, config)
  },

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} config - Axios config
   * @returns {Promise} Response promise
   */
  post(url, data, config) {
    return service.post(url, data, config)
  },

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} config - Axios config
   * @returns {Promise} Response promise
   */
  put(url, data, config) {
    return service.put(url, data, config)
  },

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {object} config - Axios config
   * @returns {Promise} Response promise
   */
  delete(url, config) {
    return service.delete(url, config)
  },

  /**
   * PATCH request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} config - Axios config
   * @returns {Promise} Response promise
   */
  patch(url, data, config) {
    return service.patch(url, data, config)
  }
}

export default request
