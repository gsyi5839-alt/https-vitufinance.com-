/**
 * CSRF Token Store
 * Manages CSRF token for API requests
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useCsrfStore = defineStore('csrf', () => {
    // State
    const csrfToken = ref('')
    const loading = ref(false)
    const error = ref(null)

    // Getters
    const hasToken = computed(() => !!csrfToken.value)

    // Actions
    async function fetchToken() {
        if (loading.value) return
        
        loading.value = true
        error.value = null
        
        try {
            const response = await axios.get('/api/csrf-token')
            if (response.data.success) {
                csrfToken.value = response.data.csrfToken
            }
        } catch (err) {
            error.value = err.message
            console.error('[CSRF] Failed to fetch token:', err)
        } finally {
            loading.value = false
        }
    }

    function setToken(token) {
        csrfToken.value = token
    }

    function clearToken() {
        csrfToken.value = ''
    }

    // Get token for request headers
    function getHeaders() {
        return csrfToken.value ? { 'X-CSRF-Token': csrfToken.value } : {}
    }

    return {
        csrfToken,
        loading,
        error,
        hasToken,
        fetchToken,
        setToken,
        clearToken,
        getHeaders
    }
})

