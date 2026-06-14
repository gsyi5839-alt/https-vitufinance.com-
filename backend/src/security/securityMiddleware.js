/**
 * Comprehensive Security Middleware - Unified Security Protection
 */
import {
    getClientIP,
    trackRequest,
    isBlocked,
    blockIP,
    detectAttackPatterns,
    setDbQuery as setIPProtectionDbQuery,
    initBlockedIPsTable,
    loadBlockedIPsFromDatabase,
    getStatistics as getIPStats,
    getAllBlockedIPs
} from './ipProtection.js';

import {
    scanRequest as scanForSqlInjection,
    sqlInjectionGuardMiddleware
} from './sqlInjectionGuard.js';

import {
    logAttack,
    getBlockDuration,
    initAttackLogsTable,
    initAttackStatsTable,
    setDbQuery as setAttackLoggerDbQuery,
    getAttackSummary,
    AttackSeverity,
    AttackType
} from './attackLogger.js';

import {
    pathTraversalProtectionMiddleware,
    uploadProtectionMiddleware,
    initFileProtectionTable,
    registerCriticalFiles,
    startFileMonitoring,
    setDbQuery as setFileProtectionDbQuery
} from './fileSystemProtection.js';

import { SECURITY_CONFIG } from './securityConfig.js';
import { checkBot, checkXSS } from './requestThreatDetectors.js';
import {
    bruteForceProtectionMiddleware,
    clearLoginAttempts,
    getBruteForceStats
} from './bruteForceProtection.js';

let dbQuery = null;

/**
 * Initialize all security modules.
 */
export async function initSecurityModules(queryFn, projectRoot = null) {
    dbQuery = queryFn;

    setIPProtectionDbQuery(queryFn);
    setAttackLoggerDbQuery(queryFn);
    setFileProtectionDbQuery(queryFn);

    console.log('[Security] Initializing security modules...');

    try {
        await Promise.all([
            initBlockedIPsTable(),
            initAttackLogsTable(),
            initAttackStatsTable(),
            initFileProtectionTable()
        ]);

        await loadBlockedIPsFromDatabase();

        if (projectRoot) {
            await registerCriticalFiles(projectRoot);
            startFileMonitoring();
        }

        console.log('[Security] All security modules initialized successfully');
    } catch (error) {
        console.error('[Security] Error initializing security modules:', error.message);
    }
}

/**
 * Comprehensive security middleware.
 */
export function comprehensiveSecurityMiddleware(req, res, next) {
    const ip = getClientIP(req);
    const path = req.originalUrl || req.url || '';
    const method = req.method;
    const userAgent = req.headers['user-agent'] || '';

    if (SECURITY_CONFIG.EXCLUDED_PATHS.some(p => path.startsWith(p))) {
        return next();
    }

    if (isBlocked(ip)) {
        console.log(`[Security] Blocked IP attempted access: ${ip} -> ${path}`);
        return res.status(403).json({
            success: false,
            message: '您的IP已被封禁',
            error: 'Your IP has been blocked due to suspicious activity'
        });
    }

    const rateResult = trackRequest(ip);
    if (!rateResult.allowed) {
        logAttack({
            ip,
            attackType: AttackType.RATE_LIMIT,
            severity: AttackSeverity.MEDIUM,
            method,
            path,
            userAgent,
            details: rateResult.reason
        });

        return res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            error: 'Rate limit exceeded'
        });
    }

    const attackResult = detectAttackPatterns(req);
    if (attackResult.isAttack) {
        const severity = attackResult.patterns.length >= 3
            ? AttackSeverity.HIGH
            : AttackSeverity.MEDIUM;

        logAttack({
            ip,
            attackType: AttackType.OTHER,
            severity,
            method,
            path,
            body: req.body,
            headers: req.headers,
            userAgent,
            details: 'Attack patterns detected in request',
            patterns: attackResult.patterns
        }).then(result => {
            if (result.shouldBlock) {
                const duration = getBlockDuration(ip);
                blockIP(ip, duration, 'Multiple attack patterns detected');
            }
        });

        if (severity === AttackSeverity.HIGH) {
            return res.status(403).json({
                success: false,
                message: '检测到恶意请求',
                error: 'Malicious request detected'
            });
        }
    }

    const sqlResult = scanForSqlInjection(req);
    if (sqlResult.hasInjection) {
        const severity = sqlResult.highestRisk === 'critical'
            ? AttackSeverity.CRITICAL
            : sqlResult.highestRisk === 'high'
                ? AttackSeverity.HIGH
                : AttackSeverity.MEDIUM;

        logAttack({
            ip,
            attackType: AttackType.SQL_INJECTION,
            severity,
            method,
            path,
            body: req.body,
            userAgent,
            details: `SQL injection detected: ${sqlResult.highestRisk} risk`,
            patterns: sqlResult.details.map(d => d.patterns).flat()
        }).then(result => {
            if (result.shouldBlock) {
                blockIP(ip, getBlockDuration(ip), 'SQL injection attempt', true);
            }
        });

        return res.status(403).json({
            success: false,
            message: '检测到SQL注入攻击',
            error: 'SQL injection attack detected'
        });
    }

    const xssResult = checkXSS(req);
    if (xssResult.hasXSS) {
        logAttack({
            ip,
            attackType: AttackType.XSS,
            severity: AttackSeverity.HIGH,
            method,
            path,
            body: req.body,
            userAgent,
            details: 'XSS patterns detected',
            patterns: xssResult.patterns
        }).then(result => {
            if (result.shouldBlock) {
                blockIP(ip, getBlockDuration(ip), 'XSS attack attempt');
            }
        });

        return res.status(403).json({
            success: false,
            message: '检测到XSS攻击',
            error: 'XSS attack detected'
        });
    }

    const botResult = checkBot(req);
    if (botResult.isBot) {
        logAttack({
            ip,
            attackType: AttackType.BOT_DETECTION,
            severity: AttackSeverity.MEDIUM,
            method,
            path,
            userAgent,
            details: botResult.reason
        });

        if (botResult.severity === 'aggressive') {
            blockIP(ip, 60 * 60 * 1000, 'Aggressive bot activity', false);

            return res.status(403).json({
                success: false,
                message: '机器人访问已被禁止',
                error: 'Bot access denied'
            });
        }
    }

    next();
}

/**
 * Add additional security headers beyond what helmet provides.
 */
export function additionalSecurityHeadersMiddleware(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');

    if (req.path.includes('/api/admin') || req.path.includes('/api/user')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    next();
}

/**
 * Get comprehensive security statistics.
 */
export function getSecurityStats() {
    const ipStats = getIPStats();
    const attackSummary = getAttackSummary();

    return {
        ipProtection: ipStats,
        attacks: attackSummary,
        bruteForce: getBruteForceStats()
    };
}

/**
 * Get blocked IPs list.
 */
export function getBlockedIPsList() {
    return getAllBlockedIPs();
}

export {
    bruteForceProtectionMiddleware,
    clearLoginAttempts,
    getClientIP,
    blockIP,
    isBlocked,
    sqlInjectionGuardMiddleware,
    pathTraversalProtectionMiddleware,
    uploadProtectionMiddleware
};

export default {
    initSecurityModules,
    comprehensiveSecurityMiddleware,
    additionalSecurityHeadersMiddleware,
    bruteForceProtectionMiddleware,
    clearLoginAttempts,
    pathTraversalProtectionMiddleware,
    uploadProtectionMiddleware,
    getSecurityStats,
    getBlockedIPsList,
    blockIP,
    getClientIP
};
