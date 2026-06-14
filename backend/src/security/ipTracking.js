import { CONFIG } from './ipProtectionConfig.js';
import {
    ipRequestTracker,
    whitelistedIPs
} from './ipProtectionState.js';
import {
    isBlocked,
    blockIP
} from './ipBlocking.js';
import { updateReputation } from './ipReputation.js';

function getClientIP(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map((ip) => ip.trim());
        return ips[0];
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;

    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

function trackRequest(ip) {
    if (!ip || ip === 'unknown') {
        return { allowed: false, reason: 'Invalid IP address' };
    }

    if (whitelistedIPs.has(ip)) {
        return { allowed: true, reason: 'Whitelisted' };
    }

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

    const oneHourAgo = now - 60 * 60 * 1000;
    tracker.timestamps = tracker.timestamps.filter((timestamp) => timestamp > oneHourAgo);
    tracker.timestamps.push(now);
    tracker.count++;

    const lastSecond = tracker.timestamps.filter((timestamp) => timestamp > now - 1000).length;
    const lastMinute = tracker.timestamps.filter((timestamp) => timestamp > now - 60000).length;
    const lastHour = tracker.timestamps.length;
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
        return { allowed: true, reason: 'OK (logged)' };
    }

    ipRequestTracker.set(ip, tracker);
    return { allowed: true, reason: 'OK' };
}

export {
    getClientIP,
    trackRequest
};
