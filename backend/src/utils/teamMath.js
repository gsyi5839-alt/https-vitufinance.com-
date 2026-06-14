/**
 * Team Rewards Mathematical Model
 *
 * This module preserves the original public exports while splitting
 * configuration, calculations, and reporting into focused files.
 */
export {
    TEAM_SAFETY_LIMITS,
    BROKER_LEVELS,
    MIN_ROBOT_PURCHASE,
    MIN_ROBOT_PURCHASE_LV1,
    MIN_ROBOT_PURCHASE_LV2_5
} from './teamMathConfig.js';

export {
    getBrokerLevelConfig,
    calculateBrokerLevel,
    evaluateLevelRequirements,
    calculateBrokerRewards,
    calculateUpgradeGap,
    checkDemotionRisk,
    analyzeTeamStructure,
    projectEarnings
} from './teamMathCore.js';

export {
    deriveTeamFormulas,
    validateLevelConfiguration,
    generateTeamReport
} from './teamMathReport.js';
