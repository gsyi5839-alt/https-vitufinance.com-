/**
 * IP protection public API.
 *
 * Keeps the original module boundary stable while the implementation is split
 * into focused state, tracking, blocking, reputation, detection, and stats
 * modules.
 */

import { setDbQuery } from './ipProtectionState.js';
import {
    getClientIP,
    trackRequest
} from './ipTracking.js';
import {
    isBlocked,
    blockIP,
    unblockIP,
    addToWhitelist,
    removeFromWhitelist,
    initBlockedIPsTable,
    loadBlockedIPsFromDatabase
} from './ipBlocking.js';
import {
    updateReputation,
    getReputation
} from './ipReputation.js';
import { detectAttackPatterns } from './ipThreatDetection.js';
import {
    getStatistics,
    getAllBlockedIPs
} from './ipProtectionStats.js';

export {
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
