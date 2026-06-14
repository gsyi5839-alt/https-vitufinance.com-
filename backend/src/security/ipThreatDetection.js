import { detectedPatterns } from './ipProtectionState.js';
import { getClientIP } from './ipTracking.js';
import { updateReputation } from './ipReputation.js';

function detectAttackPatterns(req) {
    const patterns = [];
    const ip = getClientIP(req);
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

    if (!ua || ua.length < 10) {
        patterns.push('Missing or short user agent');
    }

    const url = req.originalUrl || req.url || '';
    const isLegitAdminPath = url.startsWith('/api/admin/');
    const attackUrlPatterns = [
        /\.\.\/|\.\.%2f/i,
        /\.(php|asp|aspx|jsp|cgi)\?/i,
        /phpmyadmin|wp-admin|wp-login/i,
        /etc\/passwd|proc\/self/i,
        /cmd=|exec=|system=|passthru=/i,
        /base64_decode|eval\(|shell_exec/i
    ];

    for (const pattern of attackUrlPatterns) {
        if (pattern.toString().includes('admin') && isLegitAdminPath) {
            continue;
        }
        if (pattern.test(url)) {
            patterns.push(`Attack pattern in URL: ${url.substring(0, 100)}`);
            break;
        }
    }

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

    if (patterns.length > 0) {
        detectedPatterns.set(ip, {
            patterns,
            lastDetected: Date.now()
        });
        updateReputation(ip, patterns.length * 5);
    }

    return {
        isAttack: patterns.length > 0,
        patterns
    };
}

export {
    detectAttackPatterns
};
