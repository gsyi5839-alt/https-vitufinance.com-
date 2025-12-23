/**
 * Frontend Error Logger Utility
 * 
 * Features:
 * - Capture and log JavaScript errors
 * - Track Vue component errors
 * - Monitor API request failures
 * - Send errors to backend for persistent storage
 * - Local storage backup for offline errors
 * 
 * @module errorLogger
 */

// Error levels enum
export const ErrorLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
};

// Error sources enum
export const ErrorSource = {
    VUE: 'vue',           // Vue component errors
    API: 'api',           // API request errors
    NETWORK: 'network',   // Network errors
    WALLET: 'wallet',     // Wallet connection errors
    UI: 'ui',             // UI interaction errors
    SYSTEM: 'system'      // General system errors
};

// Configuration
const CONFIG = {
    // Maximum number of errors to store locally
    maxLocalErrors: 100,
    // Local storage key for errors
    storageKey: 'vitu_error_logs',
    // API endpoint for sending errors
    apiEndpoint: '/api/log/error',
    // Whether to send errors to backend
    enableRemoteLogging: true,
    // Minimum level to log
    minLevel: ErrorLevel.WARN,
    // Whether to log to console
    enableConsoleLog: true
};

// Error level priorities for filtering
const LEVEL_PRIORITY = {
    [ErrorLevel.DEBUG]: 0,
    [ErrorLevel.INFO]: 1,
    [ErrorLevel.WARN]: 2,
    [ErrorLevel.ERROR]: 3,
    [ErrorLevel.CRITICAL]: 4
};

/**
 * Get user info for error context
 * @returns {Object} User context info
 */
function getUserContext() {
    try {
        const walletAddress = localStorage.getItem('wallet_address') || null;
        const referralCode = localStorage.getItem('referral_code') || null;
        
        return {
            walletAddress: walletAddress ? walletAddress.slice(0, 10) + '...' : null,
            referralCode,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 200),
            timestamp: new Date().toISOString(),
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`
        };
    } catch (e) {
        return { error: 'Failed to get user context' };
    }
}

/**
 * Get stored errors from local storage
 * @returns {Array} Stored errors
 */
function getStoredErrors() {
    try {
        const stored = localStorage.getItem(CONFIG.storageKey);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Save errors to local storage
 * @param {Array} errors - Errors to save
 */
function saveErrors(errors) {
    try {
        // Keep only the most recent errors
        const trimmed = errors.slice(-CONFIG.maxLocalErrors);
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('[ErrorLogger] Failed to save errors to localStorage:', e);
    }
}

/**
 * Send error to backend
 * @param {Object} errorData - Error data to send
 */
async function sendToBackend(errorData) {
    if (!CONFIG.enableRemoteLogging) return;
    
    try {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorData)
        });
        
        if (!response.ok) {
            // Store locally if backend fails
            const errors = getStoredErrors();
            errors.push({ ...errorData, pendingSync: true });
            saveErrors(errors);
        }
    } catch (e) {
        // Store locally if network fails
        const errors = getStoredErrors();
        errors.push({ ...errorData, pendingSync: true });
        saveErrors(errors);
    }
}

/**
 * Log an error
 * @param {Object} options - Error options
 */
export function logError({
    level = ErrorLevel.ERROR,
    source = ErrorSource.SYSTEM,
    message,
    stack = null,
    metadata = null,
    componentName = null
}) {
    // Check if error level meets minimum threshold
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[CONFIG.minLevel]) {
        return;
    }
    
    // Create error record
    const errorRecord = {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level,
        source,
        message,
        stack,
        metadata,
        componentName,
        context: getUserContext(),
        createdAt: new Date().toISOString()
    };
    
    // Log to console
    if (CONFIG.enableConsoleLog) {
        const logFn = level === ErrorLevel.CRITICAL || level === ErrorLevel.ERROR
            ? console.error
            : level === ErrorLevel.WARN
                ? console.warn
                : console.log;
        
        logFn(`[${source.toUpperCase()}] [${level.toUpperCase()}] ${message}`, {
            stack,
            metadata,
            context: errorRecord.context
        });
    }
    
    // Store locally
    const errors = getStoredErrors();
    errors.push(errorRecord);
    saveErrors(errors);
    
    // Send to backend
    sendToBackend(errorRecord);
    
    return errorRecord;
}

/**
 * Log API error
 * @param {Object} options - API error options
 */
export function logApiError({ url, method, status, statusText, responseData, requestData }) {
    return logError({
        level: status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARN,
        source: ErrorSource.API,
        message: `API Error: ${method} ${url} - ${status} ${statusText}`,
        metadata: {
            url,
            method,
            status,
            statusText,
            responseData: typeof responseData === 'object' 
                ? JSON.stringify(responseData).substring(0, 500) 
                : responseData?.substring?.(0, 500),
            requestData: requestData 
                ? JSON.stringify({ ...requestData, password: undefined }).substring(0, 500)
                : null
        }
    });
}

/**
 * Log network error
 * @param {Object} options - Network error options
 */
export function logNetworkError({ url, method, errorMessage }) {
    return logError({
        level: ErrorLevel.ERROR,
        source: ErrorSource.NETWORK,
        message: `Network Error: ${method} ${url} - ${errorMessage}`,
        metadata: { url, method }
    });
}

/**
 * Log wallet error
 * @param {Object} options - Wallet error options
 */
export function logWalletError({ action, errorMessage, walletType }) {
    return logError({
        level: ErrorLevel.ERROR,
        source: ErrorSource.WALLET,
        message: `Wallet Error: ${action} - ${errorMessage}`,
        metadata: { action, walletType }
    });
}

/**
 * Log Vue component error
 * @param {Error} error - The error object
 * @param {Object} vm - Vue component instance
 * @param {string} info - Vue error info
 */
export function logVueError(error, vm, info) {
    const componentName = vm?.$options?.name || vm?.$options?.__name || 'Unknown';
    
    return logError({
        level: ErrorLevel.ERROR,
        source: ErrorSource.VUE,
        message: `Vue Error in ${componentName}: ${error.message}`,
        stack: error.stack,
        componentName,
        metadata: {
            vueInfo: info,
            props: vm?.$props ? Object.keys(vm.$props) : [],
            route: vm?.$route?.path
        }
    });
}

/**
 * Create Vue error handler plugin
 * @returns {Object} Vue plugin
 */
export function createVueErrorHandler() {
    return {
        install(app) {
            // Global error handler for Vue components
            app.config.errorHandler = (error, vm, info) => {
                logVueError(error, vm, info);
            };
            
            // Warning handler (development only)
            if (import.meta.env.DEV) {
                app.config.warnHandler = (msg, vm, trace) => {
                    logError({
                        level: ErrorLevel.WARN,
                        source: ErrorSource.VUE,
                        message: `Vue Warning: ${msg}`,
                        metadata: { trace }
                    });
                };
            }
        }
    };
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
        logError({
            level: ErrorLevel.ERROR,
            source: ErrorSource.SYSTEM,
            message: `Uncaught Error: ${event.message}`,
            stack: event.error?.stack,
            metadata: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }
        });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        logError({
            level: ErrorLevel.ERROR,
            source: ErrorSource.SYSTEM,
            message: `Unhandled Promise Rejection: ${error?.message || error}`,
            stack: error?.stack,
            metadata: { reason: String(error) }
        });
    });
    
    console.log('[ErrorLogger] Global error handlers initialized');
}

/**
 * Sync pending errors to backend
 * Call this when app becomes online
 */
export async function syncPendingErrors() {
    const errors = getStoredErrors();
    const pendingErrors = errors.filter(e => e.pendingSync);
    
    if (pendingErrors.length === 0) return;
    
    console.log(`[ErrorLogger] Syncing ${pendingErrors.length} pending errors...`);
    
    for (const error of pendingErrors) {
        try {
            await sendToBackend({ ...error, pendingSync: undefined });
            error.pendingSync = false;
        } catch (e) {
            // Keep as pending
        }
    }
    
    saveErrors(errors);
}

/**
 * Clear all stored errors
 */
export function clearStoredErrors() {
    localStorage.removeItem(CONFIG.storageKey);
}

/**
 * Get error statistics
 * @returns {Object} Error statistics
 */
export function getErrorStats() {
    const errors = getStoredErrors();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
        total: errors.length,
        last24Hours: errors.filter(e => new Date(e.createdAt) > oneDayAgo).length,
        byLevel: errors.reduce((acc, e) => {
            acc[e.level] = (acc[e.level] || 0) + 1;
            return acc;
        }, {}),
        bySource: errors.reduce((acc, e) => {
            acc[e.source] = (acc[e.source] || 0) + 1;
            return acc;
        }, {}),
        pendingSync: errors.filter(e => e.pendingSync).length
    };
}

export default {
    ErrorLevel,
    ErrorSource,
    logError,
    logApiError,
    logNetworkError,
    logWalletError,
    logVueError,
    createVueErrorHandler,
    setupGlobalErrorHandlers,
    syncPendingErrors,
    clearStoredErrors,
    getErrorStats
};

