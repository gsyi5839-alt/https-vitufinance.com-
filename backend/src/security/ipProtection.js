/**
 * IP Protection Module - Advanced IP Attack Prevention System
 * 
 * Features:
 * - Intelligent IP blocking with automatic unblock
 * - DDoS attack detection
 * - Brute force prevention
 * - IP reputation scoring
 * - Whitelist/Blacklist management with database persistence
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== Configuration ====================

const CONFIG = {
    // Request rate limits
    // Note: SPA frontends make many concurrent requests on page load
    // These limits should be very generous for normal users
    MAX_REQUESTS_PER_SECOND: 100,         // Max requests per second (increased for SPA)
    MAX_REQUESTS_PER_MINUTE: 1000,        // Max requests per minute from single IP (raised)
    MAX_REQUESTS_PER_HOUR: 10000,         // Max requests per hour from single IP (raised)
    
    // Attack detection thresholds (raised significantly to prevent false positives)
    SUSPICIOUS_THRESHOLD: 100,            // Suspicious behavior count before warning (raised from 10)
    BLOCK_THRESHOLD: 200,                 // Suspicious behavior count before blocking (raised from 20)
    PERMANENT_BLOCK_THRESHOLD: 500,       // Count before permanent block (raised from 100)
    
    // Block durations (milliseconds) - shortened to reduce impact of false positives
    TEMP_BLOCK_DURATION: 2 * 60 * 1000,         // 2 minutes (reduced from 5)
    MEDIUM_BLOCK_DURATION: 15 * 60 * 1000,      // 15 minutes (reduced from 1 hour)
    LONG_BLOCK_DURATION: 60 * 60 * 1000,        // 1 hour (reduced from 24 hours)
    
    // Cleanup intervals
    CLEANUP_INTERVAL: 5 * 60 * 1000,      // Clean up expired data every 5 minutes
    
    // Max storage sizes
    MAX_IP_RECORDS: 10000,                // Max IPs to track
    MAX_BLOCKED_IPS: 5000,                // Max blocked IPs
    
    // Enable/disable auto-blocking (set to false to only log, not block)
    AUTO_BLOCK_ENABLED: false             // Disabled to prevent blocking normal users
};

// ==================== In-Memory Storage ====================

// IP request tracking: { ip: { count: number, timestamps: number[], suspicious: number } }
const ipRequestTracker = new Map();

// Blocked IPs: { ip: { blockedAt: number, duration: number, reason: string, permanent: boolean } }
const blockedIPs = new Map();

// Whitelisted IPs (never block)
const whitelistedIPs = new Set([
    '127.0.0.1',
    '::1',
    'localhost'
]);

// IP reputation scores: { ip: number } - higher is worse
const ipReputationScores = new Map();

// Attack patterns detected: { ip: { patterns: string[], lastDetected: number } }
const detectedPatterns = new Map();

// Database query function (set from server.js)
let dbQuery = null;

/**
 * Set database query function
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

// ==================== IP Tracking Functions ====================

/**
 * Get real client IP address from request
 * @param {object} req - Express request object
 * @returns {string} - Client IP address
 */
export function getClientIP(req) {
    // Check various headers for real IP (behind proxy/load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Get first IP from comma-separated list
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }
    
    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;
    
    // Fallback to connection IP
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

/**
 * Track request from IP
 * @param {string} ip - IP address
 * @returns {object} - Tracking result { allowed: boolean, reason: string }
 */
export function trackRequest(ip) {
    if (!ip || ip === 'unknown') {
        return { allowed: false, reason: 'Invalid IP address' };
    }
    
    // Check whitelist
    if (whitelistedIPs.has(ip)) {
        return { allowed: true, reason: 'Whitelisted' };
    }
    
    // Check if blocked
    if (isBlocked(ip)) {
        return { allowed: false, reason: 'IP is blocked' };
    }
    
    const now = Date.now();
    const tracker = ipRequestTracker.get(ip) || {
        count: 0,
        timestamps: [],
        suspicious: 0,
        firstSeen: now
    };
    
    // Clean old timestamps (keep last hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    tracker.timestamps = tracker.timestamps.filter(ts => ts > oneHourAgo);
    
    // Add current timestamp
    tracker.timestamps.push(now);
    tracker.count++;
    
    // Calculate rates
    const lastSecond = tracker.timestamps.filter(ts => ts > now - 1000).length;
    const lastMinute = tracker.timestamps.filter(ts => ts > now - 60000).length;
    const lastHour = tracker.timestamps.length;
    
    // Check rate limits
    let suspiciousIncrement = 0;
    let reason = '';
    
    if (lastSecond > CONFIG.MAX_REQUESTS_PER_SECOND) {
        suspiciousIncrement = 3;
        reason = `Rate limit exceeded: ${lastSecond}/s`;
    } else if (lastMinute > CONFIG.MAX_REQUESTS_PER_MINUTE) {
        suspiciousIncrement = 2;
        reason = `Rate limit exceeded: ${lastMinute}/min`;
    } else if (lastHour > CONFIG.MAX_REQUESTS_PER_HOUR) {
        suspiciousIncrement = 1;
        reason = `Rate limit exceeded: ${lastHour}/hour`;
    }
    
    if (suspiciousIncrement > 0) {
        tracker.suspicious += suspiciousIncrement;
        updateReputation(ip, suspiciousIncrement * 2);
        
        // Check if should block (only if auto-blocking is enabled)
        if (CONFIG.AUTO_BLOCK_ENABLED) {
            if (tracker.suspicious >= CONFIG.PERMANENT_BLOCK_THRESHOLD) {
                blockIP(ip, CONFIG.LONG_BLOCK_DURATION, 'Repeated rate limit violations', true);
            } else if (tracker.suspicious >= CONFIG.BLOCK_THRESHOLD) {
                blockIP(ip, CONFIG.MEDIUM_BLOCK_DURATION, reason);
            } else if (tracker.suspicious >= CONFIG.SUSPICIOUS_THRESHOLD) {
                blockIP(ip, CONFIG.TEMP_BLOCK_DURATION, reason);
            }
        }
        
        ipRequestTracker.set(ip, tracker);
        // Don't block request, just log the suspicious activity
        return { allowed: true, reason: 'OK (logged)' };
    }
    
    ipRequestTracker.set(ip, tracker);
    return { allowed: true, reason: 'OK' };
}

// ==================== IP Blocking Functions ====================

/**
 * Check if IP is blocked
 * @param {string} ip - IP address
 * @returns {boolean} - True if blocked
 */
export function isBlocked(ip) {
    if (whitelistedIPs.has(ip)) return false;
    
    const blockInfo = blockedIPs.get(ip);
    if (!blockInfo) return false;
    
    // Check if permanent block
    if (blockInfo.permanent) return true;
    
    // Check if block expired
    const now = Date.now();
    if (now > blockInfo.blockedAt + blockInfo.duration) {
        blockedIPs.delete(ip);
        console.log(`[IPProtection] IP unblocked (expired): ${ip}`);
        return false;
    }
    
    return true;
}

/**
 * Block an IP address
 * @param {string} ip - IP address to block
 * @param {number} duration - Block duration in milliseconds
 * @param {string} reason - Reason for blocking
 * @param {boolean} permanent - Whether to block permanently
 */
export function blockIP(ip, duration = CONFIG.TEMP_BLOCK_DURATION, reason = 'Unknown', permanent = false) {
    if (whitelistedIPs.has(ip)) {
        console.log(`[IPProtection] Cannot block whitelisted IP: ${ip}`);
        return;
    }
    
    blockedIPs.set(ip, {
        blockedAt: Date.now(),
        duration: permanent ? Infinity : duration,
        reason,
        permanent
    });
    
    const durationStr = permanent ? 'PERMANENT' : `${Math.round(duration / 60000)} minutes`;
    console.log(`[IPProtection] IP BLOCKED: ${ip} | Duration: ${durationStr} | Reason: ${reason}`);
    
    // Save to database if available
    saveBlockedIPToDatabase(ip, duration, reason, permanent);
}

/**
 * Unblock an IP address
 * @param {string} ip - IP address to unblock
 */
export function unblockIP(ip) {
    blockedIPs.delete(ip);
    ipReputationScores.delete(ip);
    detectedPatterns.delete(ip);
    
    const tracker = ipRequestTracker.get(ip);
    if (tracker) {
        tracker.suspicious = 0;
        ipRequestTracker.set(ip, tracker);
    }
    
    console.log(`[IPProtection] IP unblocked: ${ip}`);
    removeBlockedIPFromDatabase(ip);
}

/**
 * Add IP to whitelist
 * @param {string} ip - IP address to whitelist
 */
export function addToWhitelist(ip) {
    whitelistedIPs.add(ip);
    blockedIPs.delete(ip);
    console.log(`[IPProtection] IP whitelisted: ${ip}`);
}

/**
 * Remove IP from whitelist
 * @param {string} ip - IP address to remove
 */
export function removeFromWhitelist(ip) {
    whitelistedIPs.delete(ip);
    console.log(`[IPProtection] IP removed from whitelist: ${ip}`);
}

// ==================== Reputation System ====================

/**
 * Update IP reputation score
 * @param {string} ip - IP address
 * @param {number} delta - Score change (positive = worse)
 */
export function updateReputation(ip, delta) {
    const current = ipReputationScores.get(ip) || 0;
    const newScore = Math.max(0, Math.min(100, current + delta));
    ipReputationScores.set(ip, newScore);
    
    // Auto-block if reputation is too bad (only if enabled)
    if (CONFIG.AUTO_BLOCK_ENABLED) {
        if (newScore >= 80) {
            blockIP(ip, CONFIG.LONG_BLOCK_DURATION, 'Bad reputation score');
        } else if (newScore >= 50) {
            blockIP(ip, CONFIG.MEDIUM_BLOCK_DURATION, 'Poor reputation score');
        }
    }
}

/**
 * Get IP reputation score
 * @param {string} ip - IP address
 * @returns {number} - Reputation score (0-100, higher is worse)
 */
export function getReputation(ip) {
    return ipReputationScores.get(ip) || 0;
}

// ==================== Attack Pattern Detection ====================

/**
 * Detect attack patterns in request
 * @param {object} req - Express request object
 * @returns {object} - Detection result { isAttack: boolean, patterns: string[] }
 */
export function detectAttackPatterns(req) {
    const patterns = [];
    const ip = getClientIP(req);
    
    // Check for suspicious user agents
    const ua = req.headers['user-agent'] || '';
    const suspiciousAgents = [
        /sqlmap/i, /nikto/i, /nmap/i, /dirbuster/i, /gobuster/i,
        /wpscan/i, /nessus/i, /acunetix/i, /burpsuite/i, /zaproxy/i,
        /python-requests/i, /curl/i, /wget/i, /libwww/i, /mechanize/i
    ];
    
    for (const pattern of suspiciousAgents) {
        if (pattern.test(ua)) {
            patterns.push(`Suspicious user agent: ${ua.substring(0, 50)}`);
            break;
        }
    }
    
    // Check for missing user agent (common in bots)
    if (!ua || ua.length < 10) {
        patterns.push('Missing or short user agent');
    }
    
    // Check URL for attack patterns
    const url = req.originalUrl || req.url || '';
    
    // Skip legitimate admin API paths
    const isLegitAdminPath = url.startsWith('/api/admin/');
    
    const attackUrlPatterns = [
        /\.\.\/|\.\.%2f/i,                    // Directory traversal
        /\.(php|asp|aspx|jsp|cgi)\?/i,        // Script injection attempts
        /phpmyadmin|wp-admin|wp-login/i,      // Common CMS admin panel probing (not our /api/admin)
        /etc\/passwd|proc\/self/i,             // Linux file access
        /cmd=|exec=|system=|passthru=/i,      // Command injection
        /base64_decode|eval\(|shell_exec/i    // PHP injection
    ];
    
    for (const pattern of attackUrlPatterns) {
        // Skip admin pattern check for legitimate admin API paths
        if (pattern.toString().includes('admin') && isLegitAdminPath) {
            continue;
        }
        if (pattern.test(url)) {
            patterns.push(`Attack pattern in URL: ${url.substring(0, 100)}`);
            break;
        }
    }
    
    // Check request body for SQL injection (basic check)
    const body = req.body ? JSON.stringify(req.body) : '';
    if (body.length > 0) {
        const sqlPatterns = [
            /union\s+select/i, /select\s+.*\s+from/i,
            /insert\s+into/i, /update\s+.*\s+set/i,
            /delete\s+from/i, /drop\s+table/i,
            /;\s*--/i, /'\s*or\s*'1/i, /"\s*or\s*"1/i
        ];
        
        for (const pattern of sqlPatterns) {
            if (pattern.test(body)) {
                patterns.push('SQL injection attempt in body');
                break;
            }
        }
    }
    
    // Store detected patterns
    if (patterns.length > 0) {
        detectedPatterns.set(ip, {
            patterns,
            lastDetected: Date.now()
        });
        
        // Update reputation based on attack severity
        updateReputation(ip, patterns.length * 5);
    }
    
    return {
        isAttack: patterns.length > 0,
        patterns
    };
}

// ==================== Database Persistence ====================

/**
 * Save blocked IP to database
 */
async function saveBlockedIPToDatabase(ip, duration, reason, permanent) {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            INSERT INTO blocked_ips (ip_address, blocked_at, duration_ms, reason, is_permanent)
            VALUES (?, NOW(), ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                blocked_at = NOW(),
                duration_ms = VALUES(duration_ms),
                reason = VALUES(reason),
                is_permanent = VALUES(is_permanent)
        `, [ip, permanent ? -1 : duration, reason, permanent ? 1 : 0]);
    } catch (error) {
        console.error('[IPProtection] Error saving blocked IP to database:', error.message);
    }
}

/**
 * Remove blocked IP from database
 */
async function removeBlockedIPFromDatabase(ip) {
    if (!dbQuery) return;
    
    try {
        await dbQuery('DELETE FROM blocked_ips WHERE ip_address = ?', [ip]);
    } catch (error) {
        console.error('[IPProtection] Error removing blocked IP from database:', error.message);
    }
}

/**
 * Load blocked IPs from database on startup
 */
export async function loadBlockedIPsFromDatabase() {
    if (!dbQuery) return;
    
    try {
        const rows = await dbQuery('SELECT * FROM blocked_ips WHERE is_permanent = 1 OR (blocked_at + INTERVAL duration_ms/1000 SECOND) > NOW()');
        
        for (const row of rows) {
            blockedIPs.set(row.ip_address, {
                blockedAt: new Date(row.blocked_at).getTime(),
                duration: row.duration_ms === -1 ? Infinity : row.duration_ms,
                reason: row.reason,
                permanent: row.is_permanent === 1
            });
        }
        
        console.log(`[IPProtection] Loaded ${rows.length} blocked IPs from database`);
    } catch (error) {
        console.error('[IPProtection] Error loading blocked IPs:', error.message);
    }
}

/**
 * Initialize blocked_ips table
 */
export async function initBlockedIPsTable() {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS blocked_ips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL UNIQUE,
                blocked_at DATETIME NOT NULL,
                duration_ms BIGINT NOT NULL,
                reason VARCHAR(255) NOT NULL,
                is_permanent TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ip_address (ip_address),
                INDEX idx_blocked_at (blocked_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[IPProtection] blocked_ips table initialized');
    } catch (error) {
        console.error('[IPProtection] Error initializing blocked_ips table:', error.message);
    }
}

// ==================== Cleanup Functions ====================

/**
 * Clean up expired data
 */
function cleanupExpiredData() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean up expired IP trackers
    for (const [ip, tracker] of ipRequestTracker.entries()) {
        if (tracker.timestamps.every(ts => ts < oneHourAgo)) {
            ipRequestTracker.delete(ip);
        }
    }
    
    // Clean up expired blocks
    for (const [ip, blockInfo] of blockedIPs.entries()) {
        if (!blockInfo.permanent && now > blockInfo.blockedAt + blockInfo.duration) {
            blockedIPs.delete(ip);
        }
    }
    
    // Clean up old patterns
    for (const [ip, data] of detectedPatterns.entries()) {
        if (now - data.lastDetected > 24 * 60 * 60 * 1000) {
            detectedPatterns.delete(ip);
        }
    }
    
    // Limit storage size
    if (ipRequestTracker.size > CONFIG.MAX_IP_RECORDS) {
        const entries = Array.from(ipRequestTracker.entries())
            .sort((a, b) => a[1].count - b[1].count);
        
        const toDelete = entries.slice(0, ipRequestTracker.size - CONFIG.MAX_IP_RECORDS);
        toDelete.forEach(([ip]) => ipRequestTracker.delete(ip));
    }
}

// Start cleanup interval
setInterval(cleanupExpiredData, CONFIG.CLEANUP_INTERVAL);

// ==================== Statistics ====================

/**
 * Get IP protection statistics
 * @returns {object} - Statistics object
 */
export function getStatistics() {
    return {
        trackedIPs: ipRequestTracker.size,
        blockedIPs: blockedIPs.size,
        whitelistedIPs: whitelistedIPs.size,
        permanentBlocks: Array.from(blockedIPs.values()).filter(b => b.permanent).length
    };
}

/**
 * Get all blocked IPs
 * @returns {Array} - Array of blocked IP info
 */
export function getAllBlockedIPs() {
    return Array.from(blockedIPs.entries()).map(([ip, info]) => ({
        ip,
        ...info,
        remainingTime: info.permanent ? 'PERMANENT' : 
            Math.max(0, Math.round((info.blockedAt + info.duration - Date.now()) / 1000))
    }));
}

export default {
    setDbQuery,
    getClientIP,
    trackRequest,
    isBlocked,
    blockIP,
    unblockIP,
    addToWhitelist,
    removeFromWhitelist,
    updateReputation,
    getReputation,
    detectAttackPatterns,
    initBlockedIPsTable,
    loadBlockedIPsFromDatabase,
    getStatistics,
    getAllBlockedIPs
};

