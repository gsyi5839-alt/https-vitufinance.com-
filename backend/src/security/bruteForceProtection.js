import { getClientIP } from './ipProtection.js';
import { logAttack, AttackSeverity, AttackType } from './attackLogger.js';

const loginAttempts = new Map();

/**
 * Brute force protection middleware for login endpoints.
 */
export function bruteForceProtectionMiddleware(req, res, next) {
    const ip = getClientIP(req);
    const now = Date.now();

    let attempts = loginAttempts.get(ip) || { count: 0, timestamps: [], blockedUntil: 0 };

    if (attempts.blockedUntil > now) {
        const remainingSeconds = Math.ceil((attempts.blockedUntil - now) / 1000);

        return res.status(429).json({
            success: false,
            message: `登录尝试过多，请 ${remainingSeconds} 秒后再试`,
            error: 'Too many login attempts',
            retryAfter: remainingSeconds
        });
    }

    const cutoff = now - 15 * 60 * 1000;
    attempts.timestamps = attempts.timestamps.filter(ts => ts > cutoff);
    attempts.timestamps.push(now);
    attempts.count = attempts.timestamps.length;

    const lastMinute = attempts.timestamps.filter(ts => ts > now - 60000).length;
    const last5Minutes = attempts.timestamps.filter(ts => ts > now - 5 * 60000).length;
    const last15Minutes = attempts.timestamps.length;

    if (last15Minutes >= 20) {
        attempts.blockedUntil = now + 30 * 60 * 1000;
        logAttack({
            ip,
            attackType: AttackType.BRUTE_FORCE,
            severity: AttackSeverity.HIGH,
            method: req.method,
            path: req.path,
            userAgent: req.headers['user-agent'],
            details: `Brute force: ${last15Minutes} attempts in 15 minutes`
        });
    } else if (last5Minutes >= 10) {
        attempts.blockedUntil = now + 5 * 60 * 1000;
        logAttack({
            ip,
            attackType: AttackType.BRUTE_FORCE,
            severity: AttackSeverity.MEDIUM,
            method: req.method,
            path: req.path,
            userAgent: req.headers['user-agent'],
            details: `Brute force: ${last5Minutes} attempts in 5 minutes`
        });
    } else if (lastMinute >= 5) {
        attempts.blockedUntil = now + 60 * 1000;
    }

    loginAttempts.set(ip, attempts);

    if (loginAttempts.size > 10000) {
        for (const [key, val] of loginAttempts.entries()) {
            if (val.timestamps.length === 0 || val.timestamps[val.timestamps.length - 1] < cutoff) {
                loginAttempts.delete(key);
            }
        }
    }

    if (attempts.blockedUntil > now) {
        const remainingSeconds = Math.ceil((attempts.blockedUntil - now) / 1000);
        return res.status(429).json({
            success: false,
            message: `登录尝试过多，请 ${remainingSeconds} 秒后再试`,
            error: 'Too many login attempts',
            retryAfter: remainingSeconds
        });
    }

    next();
}

/**
 * Clear login attempts for an IP after successful login.
 */
export function clearLoginAttempts(ip) {
    loginAttempts.delete(ip);
}

export function getBruteForceStats() {
    return {
        trackedIPs: loginAttempts.size,
        currentlyBlocked: Array.from(loginAttempts.values())
            .filter(a => a.blockedUntil > Date.now()).length
    };
}
