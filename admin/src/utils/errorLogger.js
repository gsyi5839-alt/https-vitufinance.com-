/**
 * Admin System Error Logger Utility
 * 
 * Features:
 * - Capture and log JavaScript errors
 * - Track Vue component errors
 * - Monitor API request failures
 * - Send errors to backend for persistent storage
 * - Real-time error notification
 * 
 * @module errorLogger
 */

import { ElNotification } from 'element-plus';

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
    AUTH: 'auth',         // Authentication errors
    UI: 'ui',             // UI interaction errors
    SYSTEM: 'system'      // General system errors
};

// Configuration
const CONFIG = {
    maxLocalErrors: 200,
    storageKey: 'vitu_admin_error_logs',
    apiEndpoint: '/api/admin/log/error',
    enableRemoteLogging: true,
    minLevel: ErrorLevel.INFO,
    enableConsoleLog: true,
    showNotification: true
};

// Error level priorities
const LEVEL_PRIORITY = {
    [ErrorLevel.DEBUG]: 0,
    [ErrorLevel.INFO]: 1,
    [ErrorLevel.WARN]: 2,
    [ErrorLevel.ERROR]: 3,
    [ErrorLevel.CRITICAL]: 4
};

// Notification type mapping
const NOTIFICATION_TYPE = {
    [ErrorLevel.DEBUG]: 'info',
    [ErrorLevel.INFO]: 'info',
    [ErrorLevel.WARN]: 'warning',
    [ErrorLevel.ERROR]: 'error',
    [ErrorLevel.CRITICAL]: 'error'
};

/**
 * Get admin user context
 * @returns {Object} Admin context info
 */
function getAdminContext() {
    try {
        const token = localStorage.getItem('admin_token');
        const adminInfo = localStorage.getItem('admin_info');
        let admin = null;
        
        try {
            admin = adminInfo ? JSON.parse(adminInfo) : null;
        } catch (e) {
            // Ignore parse error
        }
        
        return {
            adminId: admin?.id || null,
            adminUsername: admin?.username || null,
            isLoggedIn: !!token,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 200),
            timestamp: new Date().toISOString(),
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
    } catch (e) {
        return { error: 'Failed to get admin context' };
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
        const trimmed = errors.slice(-CONFIG.maxLocalErrors);
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('[AdminErrorLogger] Failed to save errors:', e);
    }
}

/**
 * Send error to backend
 * @param {Object} errorData - Error data to send
 */
async function sendToBackend(errorData) {
    if (!CONFIG.enableRemoteLogging) return;
    
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
                ...errorData,
                clientType: 'admin'
            })
        });
        
        if (!response.ok) {
            const errors = getStoredErrors();
            errors.push({ ...errorData, pendingSync: true });
            saveErrors(errors);
        }
    } catch (e) {
        const errors = getStoredErrors();
        errors.push({ ...errorData, pendingSync: true });
        saveErrors(errors);
    }
}

/**
 * Show notification for error
 * @param {Object} errorRecord - Error record
 */
function showErrorNotification(errorRecord) {
    if (!CONFIG.showNotification) return;
    if (LEVEL_PRIORITY[errorRecord.level] < LEVEL_PRIORITY[ErrorLevel.WARN]) return;
    
    ElNotification({
        title: `${errorRecord.source.toUpperCase()} ${errorRecord.level.toUpperCase()}`,
        message: errorRecord.message.substring(0, 200),
        type: NOTIFICATION_TYPE[errorRecord.level] || 'error',
        duration: errorRecord.level === ErrorLevel.CRITICAL ? 0 : 5000,
        position: 'top-right'
    });
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
    componentName = null,
    showNotify = true
}) {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[CONFIG.minLevel]) {
        return;
    }
    
    const errorRecord = {
        id: `admin_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level,
        source,
        message,
        stack,
        metadata,
        componentName,
        context: getAdminContext(),
        createdAt: new Date().toISOString()
    };
    
    // Console logging
    if (CONFIG.enableConsoleLog) {
        const logFn = level === ErrorLevel.CRITICAL || level === ErrorLevel.ERROR
            ? console.error
            : level === ErrorLevel.WARN
                ? console.warn
                : console.log;
        
        logFn(`[ADMIN] [${source.toUpperCase()}] [${level.toUpperCase()}] ${message}`, {
            stack,
            metadata,
            context: errorRecord.context
        });
    }
    
    // Local storage
    const errors = getStoredErrors();
    errors.push(errorRecord);
    saveErrors(errors);
    
    // Send to backend
    sendToBackend(errorRecord);
    
    // Show notification
    if (showNotify) {
        showErrorNotification(errorRecord);
    }
    
    return errorRecord;
}

/**
 * Log API error
 * @param {Object} options - API error options
 */
export function logApiError({ url, method, status, statusText, responseData, requestData }) {
    const isAuthError = status === 401 || status === 403;
    
    return logError({
        level: isAuthError ? ErrorLevel.WARN : (status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARN),
        source: isAuthError ? ErrorSource.AUTH : ErrorSource.API,
        message: `API Error: ${method} ${url} - ${status} ${statusText}`,
        metadata: {
            url,
            method,
            status,
            statusText,
            responseData: typeof responseData === 'object'
                ? JSON.stringify(responseData).substring(0, 1000)
                : responseData?.substring?.(0, 1000),
            requestData: requestData
                ? JSON.stringify({ ...requestData, password: undefined, token: undefined }).substring(0, 500)
                : null
        },
        showNotify: status >= 500
    });
}

/**
 * Log authentication error
 * @param {Object} options - Auth error options
 */
export function logAuthError({ action, errorMessage, statusCode }) {
    return logError({
        level: ErrorLevel.WARN,
        source: ErrorSource.AUTH,
        message: `Auth Error: ${action} - ${errorMessage}`,
        metadata: { action, statusCode }
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
            app.config.errorHandler = (error, vm, info) => {
                logVueError(error, vm, info);
            };
            
            if (import.meta.env.DEV) {
                app.config.warnHandler = (msg, vm, trace) => {
                    logError({
                        level: ErrorLevel.WARN,
                        source: ErrorSource.VUE,
                        message: `Vue Warning: ${msg}`,
                        metadata: { trace },
                        showNotify: false
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
    
    console.log('[AdminErrorLogger] Global error handlers initialized');
}

/**
 * Sync pending errors to backend
 */
export async function syncPendingErrors() {
    const errors = getStoredErrors();
    const pendingErrors = errors.filter(e => e.pendingSync);
    
    if (pendingErrors.length === 0) return;
    
    console.log(`[AdminErrorLogger] Syncing ${pendingErrors.length} pending errors...`);
    
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

/**
 * Get recent errors
 * @param {number} count - Number of errors to return
 * @returns {Array} Recent errors
 */
export function getRecentErrors(count = 10) {
    const errors = getStoredErrors();
    return errors.slice(-count).reverse();
}

export default {
    ErrorLevel,
    ErrorSource,
    logError,
    logApiError,
    logAuthError,
    logVueError,
    createVueErrorHandler,
    setupGlobalErrorHandlers,
    syncPendingErrors,
    clearStoredErrors,
    getErrorStats,
    getRecentErrors
};

