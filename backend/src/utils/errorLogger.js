/**
 * Error Logger Utility
 * Handles error logging, monitoring, and reporting
 */

// Error levels enum
export const ErrorLevel = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
};

// Error sources enum
export const ErrorSource = {
    API: 'api',
    DATABASE: 'database',
    AUTHENTICATION: 'authentication',
    BLOCKCHAIN: 'blockchain',
    CRON: 'cron',
    SYSTEM: 'system'
};

// Store database query function
let dbQuery = null;

/**
 * Set database query function
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

/**
 * Initialize error logs table
 */
export async function initErrorLogsTable() {
    if (!dbQuery) {
        console.warn('[ErrorLogger] Database not connected, skipping table initialization');
        return;
    }
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                level VARCHAR(20) NOT NULL,
                source VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                stack TEXT,
                metadata JSON,
                user_wallet VARCHAR(42),
                request_path VARCHAR(255),
                request_method VARCHAR(10),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_level (level),
                INDEX idx_source (source),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[ErrorLogger] Error logs table initialized');
    } catch (error) {
        console.error('[ErrorLogger] Failed to initialize table:', error.message);
    }
}

/**
 * Log an error to database and console
 * @param {Object} options - Error options
 */
export async function logError({
    level = ErrorLevel.ERROR,
    source = ErrorSource.SYSTEM,
    message,
    stack = null,
    metadata = null,
    userWallet = null,
    requestPath = null,
    requestMethod = null
}) {
    // Always log to console
    const logFn = level === ErrorLevel.CRITICAL || level === ErrorLevel.ERROR 
        ? console.error 
        : level === ErrorLevel.WARN 
            ? console.warn 
            : console.log;
    
    logFn(`[${source.toUpperCase()}] [${level.toUpperCase()}] ${message}`);
    if (stack) {
        logFn(stack);
    }
    
    // Log to database if available
    if (dbQuery) {
        try {
            await dbQuery(
                `INSERT INTO error_logs (level, source, message, stack, metadata, user_wallet, request_path, request_method)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    level,
                    source,
                    message,
                    stack,
                    metadata ? JSON.stringify(metadata) : null,
                    userWallet,
                    requestPath,
                    requestMethod
                ]
            );
        } catch (dbError) {
            console.error('[ErrorLogger] Failed to log to database:', dbError.message);
        }
    }
}

/**
 * Express middleware for error logging
 */
export function errorLoggerMiddleware(err, req, res, next) {
    const errorInfo = {
        level: ErrorLevel.ERROR,
        source: ErrorSource.API,
        message: err.message || 'Unknown error',
        stack: err.stack,
        metadata: {
            url: req.originalUrl,
            query: req.query,
            body: req.body ? { ...req.body, password: undefined } : null
        },
        userWallet: req.body?.wallet || req.query?.wallet || null,
        requestPath: req.path,
        requestMethod: req.method
    };
    
    // Log the error
    logError(errorInfo);
    
    // Send error response if headers not sent
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message
        });
    }
}

/**
 * Setup global error handlers for uncaught exceptions
 */
export function setupGlobalErrorHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logError({
            level: ErrorLevel.CRITICAL,
            source: ErrorSource.SYSTEM,
            message: `Uncaught Exception: ${error.message}`,
            stack: error.stack
        });
        // Give time for logging before exit
        setTimeout(() => process.exit(1), 1000);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logError({
            level: ErrorLevel.ERROR,
            source: ErrorSource.SYSTEM,
            message: `Unhandled Rejection: ${reason}`,
            stack: reason instanceof Error ? reason.stack : null,
            metadata: { promise: String(promise) }
        });
    });
    
    console.log('[ErrorLogger] Global error handlers initialized');
}

/**
 * Get error statistics
 * @param {Object} options - Query options
 * @returns {Object} Error statistics
 */
export async function getErrorStats({ startDate, endDate, source, level } = {}) {
    if (!dbQuery) {
        return { total: 0, byLevel: {}, bySource: {} };
    }
    
    try {
        let whereClause = '1=1';
        const params = [];
        
        if (startDate) {
            whereClause += ' AND created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ' AND created_at <= ?';
            params.push(endDate);
        }
        if (source) {
            whereClause += ' AND source = ?';
            params.push(source);
        }
        if (level) {
            whereClause += ' AND level = ?';
            params.push(level);
        }
        
        const [totalResult] = await dbQuery(
            `SELECT COUNT(*) as total FROM error_logs WHERE ${whereClause}`,
            params
        );
        
        const byLevelResult = await dbQuery(
            `SELECT level, COUNT(*) as count FROM error_logs WHERE ${whereClause} GROUP BY level`,
            params
        );
        
        const bySourceResult = await dbQuery(
            `SELECT source, COUNT(*) as count FROM error_logs WHERE ${whereClause} GROUP BY source`,
            params
        );
        
        return {
            total: totalResult?.total || 0,
            byLevel: byLevelResult.reduce((acc, row) => ({ ...acc, [row.level]: row.count }), {}),
            bySource: bySourceResult.reduce((acc, row) => ({ ...acc, [row.source]: row.count }), {})
        };
    } catch (error) {
        console.error('[ErrorLogger] Failed to get stats:', error.message);
        return { total: 0, byLevel: {}, bySource: {} };
    }
}

/**
 * Resolve an error (mark as handled)
 * @param {number} errorId - Error ID
 * @param {string} resolution - Resolution notes
 */
export async function resolveError(errorId, resolution) {
    if (!dbQuery) return false;
    
    try {
        await dbQuery(
            `UPDATE error_logs SET metadata = JSON_SET(COALESCE(metadata, '{}'), '$.resolved', true, '$.resolution', ?) WHERE id = ?`,
            [resolution, errorId]
        );
        return true;
    } catch (error) {
        console.error('[ErrorLogger] Failed to resolve error:', error.message);
        return false;
    }
}

/**
 * Resolve similar errors
 * @param {string} message - Error message pattern
 * @param {string} resolution - Resolution notes
 */
export async function resolveSimilarErrors(message, resolution) {
    if (!dbQuery) return 0;
    
    try {
        const result = await dbQuery(
            `UPDATE error_logs SET metadata = JSON_SET(COALESCE(metadata, '{}'), '$.resolved', true, '$.resolution', ?) WHERE message LIKE ?`,
            [resolution, `%${message}%`]
        );
        return result.affectedRows || 0;
    } catch (error) {
        console.error('[ErrorLogger] Failed to resolve similar errors:', error.message);
        return 0;
    }
}

export default {
    ErrorLevel,
    ErrorSource,
    setDbQuery,
    initErrorLogsTable,
    logError,
    errorLoggerMiddleware,
    setupGlobalErrorHandlers,
    getErrorStats,
    resolveError,
    resolveSimilarErrors
};

