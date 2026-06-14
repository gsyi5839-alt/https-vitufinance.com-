import { CONFIG } from './ipProtectionConfig.js';
import {
    ipRequestTracker,
    blockedIPs,
    whitelistedIPs,
    detectedPatterns
} from './ipProtectionState.js';

function cleanupExpiredData() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [ip, tracker] of ipRequestTracker.entries()) {
        if (tracker.timestamps.every((timestamp) => timestamp < oneHourAgo)) {
            ipRequestTracker.delete(ip);
        }
    }

    for (const [ip, blockInfo] of blockedIPs.entries()) {
        if (!blockInfo.permanent && now > blockInfo.blockedAt + blockInfo.duration) {
            blockedIPs.delete(ip);
        }
    }

    for (const [ip, data] of detectedPatterns.entries()) {
        if (now - data.lastDetected > 24 * 60 * 60 * 1000) {
            detectedPatterns.delete(ip);
        }
    }

    if (ipRequestTracker.size > CONFIG.MAX_IP_RECORDS) {
        const entries = Array.from(ipRequestTracker.entries())
            .sort((a, b) => a[1].count - b[1].count);

        const toDelete = entries.slice(0, ipRequestTracker.size - CONFIG.MAX_IP_RECORDS);
        toDelete.forEach(([ip]) => ipRequestTracker.delete(ip));
    }
}

setInterval(cleanupExpiredData, CONFIG.CLEANUP_INTERVAL);

function getStatistics() {
    return {
        trackedIPs: ipRequestTracker.size,
        blockedIPs: blockedIPs.size,
        whitelistedIPs: whitelistedIPs.size,
        permanentBlocks: Array.from(blockedIPs.values()).filter((block) => block.permanent).length
    };
}

function getAllBlockedIPs() {
    return Array.from(blockedIPs.entries()).map(([ip, info]) => ({
        ip,
        ...info,
        remainingTime: info.permanent
            ? 'PERMANENT'
            : Math.max(0, Math.round((info.blockedAt + info.duration - Date.now()) / 1000))
    }));
}

export {
    getStatistics,
    getAllBlockedIPs
};
