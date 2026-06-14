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

// Request interceptor - add CSRF token + wallet auth token
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
        // SECURITY (C2): attach the wallet signature JWT so the backend can verify wallet
        // ownership. Without this, /api/user endpoints can be called for any wallet.
        try {
            const walletToken = localStorage.getItem('wallet_auth_token')
            if (walletToken) {
                config.headers['Authorization'] = `Bearer ${walletToken}`
            }
        } catch (e) {
            // localStorage unavailable
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

        // SECURITY (C2): clear an invalid/expired wallet JWT so the next flow re-authenticates.
        if (error.response?.status === 401 || error.response?.data?.code === 'AUTH_REQUIRED') {
            try {
                localStorage.removeItem('wallet_auth_token')
                localStorage.removeItem('wallet_auth_token_exp')
                localStorage.removeItem('wallet_auth_wallet')
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

