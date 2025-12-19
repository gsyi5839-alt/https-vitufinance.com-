/**
 * Secure API Utility
 * Provides secure HTTP request methods with CSRF protection
 */
import axios from 'axios'
import { useCsrfStore } from '@/stores/csrf'

// Create axios instance
// Note: baseURL is empty because frontend code already includes /api prefix in URLs
const api = axios.create({
    baseURL: '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor - add CSRF token
api.interceptors.request.use(
    (config) => {
        try {
            const csrfStore = useCsrfStore()
            if (csrfStore.csrfToken) {
                config.headers['X-CSRF-Token'] = csrfStore.csrfToken
            }
        } catch (e) {
            // Store might not be initialized
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => {
        // Update CSRF token if provided in response
        const newToken = response.headers['x-csrf-token']
        if (newToken) {
            try {
                const csrfStore = useCsrfStore()
                csrfStore.setToken(newToken)
            } catch (e) {
                // Store might not be initialized
            }
        }
        return response.data
    },
    (error) => {
        // Handle CSRF token errors
        if (error.response?.status === 403) {
            console.error('[SecureAPI] CSRF token invalid or expired')
            // Try to refresh token
            try {
                const csrfStore = useCsrfStore()
                csrfStore.fetchToken()
            } catch (e) {
                // Ignore
            }
        }
        
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Network error'
        }
    }
)

/**
 * POST request with automatic error handling
 * @param {string} url - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
export async function post(url, data = {}) {
    try {
        const response = await api.post(url, data)
        return response
    } catch (error) {
        console.error(`[SecureAPI] POST ${url} failed:`, error)
        return {
            success: false,
            message: error.message || 'Request failed'
        }
    }
}

/**
 * GET request with automatic error handling
 * @param {string} url - API endpoint
 * @param {object} params - Query parameters
 * @returns {Promise<object>} Response data
 */
export async function get(url, params = {}) {
    try {
        const response = await api.get(url, { params })
        return response
    } catch (error) {
        console.error(`[SecureAPI] GET ${url} failed:`, error)
        return {
            success: false,
            message: error.message || 'Request failed'
        }
    }
}

export default {
    post,
    get
}

