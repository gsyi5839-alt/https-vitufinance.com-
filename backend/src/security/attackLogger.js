/**
 * Attack Logger Module - Advanced Security Attack Logging System
 * 
 * Features:
 * - Log all attack attempts to database
 * - Real-time attack monitoring
 * - Attack pattern analysis
 * - Automatic IP blocking based on attack frequency
 * - Attack statistics and reporting
 */

// Database query function (set from server.js)
let dbQuery = null;

// In-memory attack counter for quick access
const attackCounter = new Map();

// Attack severity levels
export const AttackSeverity = {
    LOW: 'low',           // Minor suspicious activity
    MEDIUM: 'medium',     // Moderate attack attempt
    HIGH: 'high',         // Serious attack attempt
    CRITICAL: 'critical'  // Severe attack, immediate block required
};

// Attack types
export const AttackType = {
    SQL_INJECTION: 'sql_injection',
    XSS: 'xss',
    CSRF: 'csrf',
    RATE_LIMIT: 'rate_limit',
    BRUTE_FORCE: 'brute_force',
    DIRECTORY_TRAVERSAL: 'directory_traversal',
    FILE_UPLOAD: 'file_upload',
    COMMAND_INJECTION: 'command_injection',
    DDOS: 'ddos',
    SUSPICIOUS_UA: 'suspicious_ua',
    BOT_DETECTION: 'bot_detection',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    FILE_MANIPULATION: 'file_manipulation',
    OTHER: 'other'
};

// ==================== Configuration ====================

const CONFIG = {
    // Auto-block thresholds
    BLOCK_THRESHOLD_LOW: 50,       // Block after 50 low severity attacks
    BLOCK_THRESHOLD_MEDIUM: 20,    // Block after 20 medium severity attacks
    BLOCK_THRESHOLD_HIGH: 5,       // Block after 5 high severity attacks
    BLOCK_THRESHOLD_CRITICAL: 1,   // Block immediately on critical attack
    
    // Time window for counting attacks (milliseconds)
    COUNT_WINDOW: 60 * 60 * 1000,  // 1 hour
    
    // Block durations based on severity
    BLOCK_DURATION_LOW: 15 * 60 * 1000,      // 15 minutes
    BLOCK_DURATION_MEDIUM: 60 * 60 * 1000,   // 1 hour
    BLOCK_DURATION_HIGH: 24 * 60 * 60 * 1000, // 24 hours
    BLOCK_DURATION_CRITICAL: -1,              // Permanent (needs manual unblock)
    
    // Max log entries to keep in memory
    MAX_MEMORY_LOGS: 1000
};

// ==================== Database Functions ====================

/**
 * Set database query function
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

/**
 * Initialize attack_logs table
 */
export async function initAttackLogsTable() {
    if (!dbQuery) {
        console.error('[AttackLogger] Database query function not set');
        return;
    }
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS attack_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                attack_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                request_method VARCHAR(10),
                request_path VARCHAR(500),
                request_body TEXT,
                request_headers TEXT,
                user_agent VARCHAR(500),
                referer VARCHAR(500),
                attack_details TEXT,
                patterns_detected TEXT,
                blocked TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ip_address (ip_address),
                INDEX idx_attack_type (attack_type),
                INDEX idx_severity (severity),
                INDEX idx_created_at (created_at),
                INDEX idx_blocked (blocked)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[AttackLogger] attack_logs table initialized');
    } catch (error) {
        console.error('[AttackLogger] Error initializing attack_logs table:', error.message);
    }
}

/**
 * Initialize attack_statistics table for aggregated stats
 */
export async function initAttackStatsTable() {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS attack_statistics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                stat_date DATE NOT NULL,
                attack_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                attack_count INT DEFAULT 0,
                unique_ips INT DEFAULT 0,
                blocked_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_stat (stat_date, attack_type, severity),
                INDEX idx_stat_date (stat_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[AttackLogger] attack_statistics table initialized');
    } catch (error) {
        console.error('[AttackLogger] Error initializing attack_statistics table:', error.message);
    }
}

// ==================== Attack Logging Functions ====================

/**
 * Log an attack attempt
 * @param {object} attackInfo - Attack information
 * @returns {Promise<object>} - Log result with shouldBlock indicator
 */
export async function logAttack(attackInfo) {
    const {
        ip,
        attackType,
        severity = AttackSeverity.MEDIUM,
        method = 'GET',
        path = '/',
        body = null,
        headers = null,
        userAgent = '',
        referer = '',
        details = '',
        patterns = []
    } = attackInfo;
    
    const now = Date.now();
    
    // Update in-memory counter
    updateAttackCounter(ip, severity, now);
    
    // Check if should block
    const shouldBlock = checkShouldBlock(ip);
    
    // Log to console with color coding
    const severityColor = getSeverityColor(severity);
    console.log(`\x1b[${severityColor}m[AttackLogger] ${severity.toUpperCase()} - ${attackType}\x1b[0m`);
    console.log(`  IP: ${ip}`);
    console.log(`  Path: ${method} ${path}`);
    console.log(`  Details: ${details}`);
    if (patterns.length > 0) {
        console.log(`  Patterns: ${patterns.join(', ')}`);
    }
    if (shouldBlock) {
        console.log(`  \x1b[31m*** IP SHOULD BE BLOCKED ***\x1b[0m`);
    }
    
    // Log to database
    if (dbQuery) {
        try {
            await dbQuery(`
                INSERT INTO attack_logs 
                (ip_address, attack_type, severity, request_method, request_path, 
                 request_body, request_headers, user_agent, referer, attack_details, 
                 patterns_detected, blocked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ip,
                attackType,
                severity,
                method,
                path.substring(0, 500),
                body ? JSON.stringify(body).substring(0, 10000) : null,
                headers ? JSON.stringify(sanitizeHeaders(headers)).substring(0, 10000) : null,
                userAgent.substring(0, 500),
                referer.substring(0, 500),
                details.substring(0, 10000),
                JSON.stringify(patterns),
                shouldBlock ? 1 : 0
            ]);
            
            // Update daily statistics
            await updateDailyStats(attackType, severity, shouldBlock);
        } catch (error) {
            console.error('[AttackLogger] Error logging attack to database:', error.message);
        }
    }
    
    return { logged: true, shouldBlock, severity };
}

/**
 * Sanitize headers to remove sensitive information before logging
 * @param {object} headers - Request headers
 * @returns {object} - Sanitized headers
 */
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = '***HIDDEN***';
        }
    }
    
    return sanitized;
}

/**
 * Get console color code for severity level
 * @param {string} severity - Severity level
 * @returns {string} - ANSI color code
 */
function getSeverityColor(severity) {
    switch (severity) {
        case AttackSeverity.LOW: return '33';     // Yellow
        case AttackSeverity.MEDIUM: return '35';  // Magenta
        case AttackSeverity.HIGH: return '31';    // Red
        case AttackSeverity.CRITICAL: return '41'; // Red background
        default: return '37'; // White
    }
}

// ==================== Attack Counter Functions ====================

/**
 * Update in-memory attack counter
 * @param {string} ip - IP address
 * @param {string} severity - Attack severity
 * @param {number} timestamp - Current timestamp
 */
function updateAttackCounter(ip, severity, timestamp) {
    let counter = attackCounter.get(ip);
    
    if (!counter) {
        counter = {
            low: [],
            medium: [],
            high: [],
            critical: [],
            firstSeen: timestamp
        };
    }
    
    // Clean old entries
    const cutoff = timestamp - CONFIG.COUNT_WINDOW;
    counter.low = counter.low.filter(ts => ts > cutoff);
    counter.medium = counter.medium.filter(ts => ts > cutoff);
    counter.high = counter.high.filter(ts => ts > cutoff);
    counter.critical = counter.critical.filter(ts => ts > cutoff);
    
    // Add new entry
    if (counter[severity]) {
        counter[severity].push(timestamp);
    }
    
    attackCounter.set(ip, counter);
    
    // Limit memory usage
    if (attackCounter.size > CONFIG.MAX_MEMORY_LOGS) {
        const oldestIP = [...attackCounter.entries()]
            .sort((a, b) => a[1].firstSeen - b[1].firstSeen)[0][0];
        attackCounter.delete(oldestIP);
    }
}

/**
 * Check if IP should be blocked based on attack frequency
 * @param {string} ip - IP address
 * @returns {boolean} - True if should block
 */
function checkShouldBlock(ip) {
    const counter = attackCounter.get(ip);
    if (!counter) return false;
    
    if (counter.critical.length >= CONFIG.BLOCK_THRESHOLD_CRITICAL) return true;
    if (counter.high.length >= CONFIG.BLOCK_THRESHOLD_HIGH) return true;
    if (counter.medium.length >= CONFIG.BLOCK_THRESHOLD_MEDIUM) return true;
    if (counter.low.length >= CONFIG.BLOCK_THRESHOLD_LOW) return true;
    
    return false;
}

/**
 * Get block duration based on IP's attack history
 * @param {string} ip - IP address
 * @returns {number} - Block duration in milliseconds (-1 for permanent)
 */
export function getBlockDuration(ip) {
    const counter = attackCounter.get(ip);
    if (!counter) return CONFIG.BLOCK_DURATION_LOW;
    
    if (counter.critical.length > 0) return CONFIG.BLOCK_DURATION_CRITICAL;
    if (counter.high.length >= CONFIG.BLOCK_THRESHOLD_HIGH) return CONFIG.BLOCK_DURATION_HIGH;
    if (counter.medium.length >= CONFIG.BLOCK_THRESHOLD_MEDIUM) return CONFIG.BLOCK_DURATION_MEDIUM;
    
    return CONFIG.BLOCK_DURATION_LOW;
}

// ==================== Statistics Functions ====================

/**
 * Update daily attack statistics
 * @param {string} attackType - Attack type
 * @param {string} severity - Severity level
 * @param {boolean} blocked - Whether IP was blocked
 */
async function updateDailyStats(attackType, severity, blocked) {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            INSERT INTO attack_statistics 
            (stat_date, attack_type, severity, attack_count, blocked_count)
            VALUES (CURDATE(), ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE
                attack_count = attack_count + 1,
                blocked_count = blocked_count + VALUES(blocked_count),
                updated_at = NOW()
        `, [attackType, severity, blocked ? 1 : 0]);
    } catch (error) {
        // Silently fail to avoid affecting request processing
    }
}

/**
 * Get attack statistics for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} - Attack statistics
 */
export async function getAttackStats(startDate, endDate) {
    if (!dbQuery) return [];
    
    try {
        return await dbQuery(`
            SELECT stat_date, attack_type, severity, 
                   SUM(attack_count) as total_attacks,
                   SUM(blocked_count) as total_blocked
            FROM attack_statistics
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY stat_date, attack_type, severity
            ORDER BY stat_date DESC, total_attacks DESC
        `, [startDate, endDate]);
    } catch (error) {
        console.error('[AttackLogger] Error getting attack stats:', error.message);
        return [];
    }
}

/**
 * Get recent attacks for monitoring
 * @param {number} limit - Max number of records
 * @returns {Promise<Array>} - Recent attack logs
 */
export async function getRecentAttacks(limit = 100) {
    if (!dbQuery) return [];
    
    try {
        return await dbQuery(`
            SELECT id, ip_address, attack_type, severity, request_method,
                   request_path, attack_details, blocked, created_at
            FROM attack_logs
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]);
    } catch (error) {
        console.error('[AttackLogger] Error getting recent attacks:', error.message);
        return [];
    }
}

/**
 * Get attacks by IP address
 * @param {string} ip - IP address
 * @param {number} limit - Max number of records
 * @returns {Promise<Array>} - Attack logs for IP
 */
export async function getAttacksByIP(ip, limit = 50) {
    if (!dbQuery) return [];
    
    try {
        return await dbQuery(`
            SELECT id, attack_type, severity, request_method,
                   request_path, attack_details, blocked, created_at
            FROM attack_logs
            WHERE ip_address = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [ip, limit]);
    } catch (error) {
        console.error('[AttackLogger] Error getting attacks by IP:', error.message);
        return [];
    }
}

/**
 * Get summary of attack counts in memory
 * @returns {object} - Attack summary
 */
export function getAttackSummary() {
    let totalLow = 0, totalMedium = 0, totalHigh = 0, totalCritical = 0;
    
    for (const counter of attackCounter.values()) {
        totalLow += counter.low.length;
        totalMedium += counter.medium.length;
        totalHigh += counter.high.length;
        totalCritical += counter.critical.length;
    }
    
    return {
        uniqueIPs: attackCounter.size,
        low: totalLow,
        medium: totalMedium,
        high: totalHigh,
        critical: totalCritical,
        total: totalLow + totalMedium + totalHigh + totalCritical
    };
}

/**
 * Clean up old in-memory attack counters
 */
export function cleanupOldCounters() {
    const now = Date.now();
    const cutoff = now - CONFIG.COUNT_WINDOW * 2;
    
    for (const [ip, counter] of attackCounter.entries()) {
        // Remove IPs with no recent activity
        if (counter.firstSeen < cutoff) {
            const hasRecent = 
                counter.low.some(ts => ts > cutoff) ||
                counter.medium.some(ts => ts > cutoff) ||
                counter.high.some(ts => ts > cutoff) ||
                counter.critical.some(ts => ts > cutoff);
            
            if (!hasRecent) {
                attackCounter.delete(ip);
            }
        }
    }
}

// Start periodic cleanup
setInterval(cleanupOldCounters, 10 * 60 * 1000); // Every 10 minutes

export default {
    setDbQuery,
    initAttackLogsTable,
    initAttackStatsTable,
    logAttack,
    getBlockDuration,
    getAttackStats,
    getRecentAttacks,
    getAttacksByIP,
    getAttackSummary,
    AttackSeverity,
    AttackType
};

