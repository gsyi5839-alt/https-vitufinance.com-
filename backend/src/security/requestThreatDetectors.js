import { SECURITY_CONFIG } from './securityConfig.js';

/**
 * Check request for XSS patterns.
 */
export function checkXSS(req) {
    const patterns = [];

    const url = req.originalUrl || req.url || '';
    for (const pattern of SECURITY_CONFIG.XSS_PATTERNS) {
        if (pattern.test(url)) {
            patterns.push(`URL: ${pattern.toString()}`);
        }
    }

    if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        for (const pattern of SECURITY_CONFIG.XSS_PATTERNS) {
            if (pattern.test(bodyStr)) {
                patterns.push(`Body: ${pattern.toString()}`);
            }
        }
    }

    if (req.query) {
        const queryStr = JSON.stringify(req.query);
        for (const pattern of SECURITY_CONFIG.XSS_PATTERNS) {
            if (pattern.test(queryStr)) {
                patterns.push(`Query: ${pattern.toString()}`);
            }
        }
    }

    return {
        hasXSS: patterns.length > 0,
        patterns
    };
}

/**
 * Check if request appears to be from a scanner or automated client.
 */
export function checkBot(req) {
    const userAgent = req.headers['user-agent'] || '';
    const path = req.originalUrl || req.url || '';

    for (const pattern of SECURITY_CONFIG.BOT_PATTERNS.AGENTS) {
        if (pattern.test(userAgent)) {
            return {
                isBot: true,
                reason: `Suspicious user agent: ${userAgent.substring(0, 100)}`,
                severity: 'aggressive'
            };
        }
    }

    if (!userAgent || userAgent.length < 10) {
        return {
            isBot: true,
            reason: 'Missing or too short user agent',
            severity: 'suspicious'
        };
    }

    for (const pattern of SECURITY_CONFIG.BOT_PATTERNS.PATHS) {
        if (pattern.test(path)) {
            return {
                isBot: true,
                reason: `Suspicious path access: ${path}`,
                severity: 'aggressive'
            };
        }
    }

    return { isBot: false, reason: '', severity: '' };
}
