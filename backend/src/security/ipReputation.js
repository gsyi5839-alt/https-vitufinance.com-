import { CONFIG } from './ipProtectionConfig.js';
import { ipReputationScores } from './ipProtectionState.js';
import { blockIP } from './ipBlocking.js';

function updateReputation(ip, delta) {
    const current = ipReputationScores.get(ip) || 0;
    const newScore = Math.max(0, Math.min(100, current + delta));
    ipReputationScores.set(ip, newScore);

    if (CONFIG.AUTO_BLOCK_ENABLED) {
        if (newScore >= 80) {
            blockIP(ip, CONFIG.LONG_BLOCK_DURATION, 'Bad reputation score');
        } else if (newScore >= 50) {
            blockIP(ip, CONFIG.MEDIUM_BLOCK_DURATION, 'Poor reputation score');
        }
    }
}

function getReputation(ip) {
    return ipReputationScores.get(ip) || 0;
}

export {
    updateReputation,
    getReputation
};
