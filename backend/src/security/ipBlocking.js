import { CONFIG } from './ipProtectionConfig.js';
import {
    blockedIPs,
    whitelistedIPs,
    ipRequestTracker,
    ipReputationScores,
    detectedPatterns,
    getDbQuery
} from './ipProtectionState.js';

function isBlocked(ip) {
    if (whitelistedIPs.has(ip)) return false;

    const blockInfo = blockedIPs.get(ip);
    if (!blockInfo) return false;

    if (blockInfo.permanent) return true;

    const now = Date.now();
    if (now > blockInfo.blockedAt + blockInfo.duration) {
        blockedIPs.delete(ip);
        console.log(`[IPProtection] IP unblocked (expired): ${ip}`);
        return false;
    }

    return true;
}

function blockIP(ip, duration = CONFIG.TEMP_BLOCK_DURATION, reason = 'Unknown', permanent = false) {
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

    saveBlockedIPToDatabase(ip, duration, reason, permanent);
}

function unblockIP(ip) {
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

function addToWhitelist(ip) {
    whitelistedIPs.add(ip);
    blockedIPs.delete(ip);
    console.log(`[IPProtection] IP whitelisted: ${ip}`);
}

function removeFromWhitelist(ip) {
    whitelistedIPs.delete(ip);
    console.log(`[IPProtection] IP removed from whitelist: ${ip}`);
}

async function saveBlockedIPToDatabase(ip, duration, reason, permanent) {
    const dbQuery = getDbQuery();
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

async function removeBlockedIPFromDatabase(ip) {
    const dbQuery = getDbQuery();
    if (!dbQuery) return;

    try {
        await dbQuery('DELETE FROM blocked_ips WHERE ip_address = ?', [ip]);
    } catch (error) {
        console.error('[IPProtection] Error removing blocked IP from database:', error.message);
    }
}

async function loadBlockedIPsFromDatabase() {
    const dbQuery = getDbQuery();
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

async function initBlockedIPsTable() {
    const dbQuery = getDbQuery();
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

export {
    isBlocked,
    blockIP,
    unblockIP,
    addToWhitelist,
    removeFromWhitelist,
    initBlockedIPsTable,
    loadBlockedIPsFromDatabase
};
