import {
    BROKER_LEVELS,
    MIN_ROBOT_PURCHASE
} from './teamMathConfig.js';

export function getBrokerLevelConfig(level) {
    if (level < 0 || level > 5) {
        return BROKER_LEVELS[0];
    }
    return BROKER_LEVELS[level];
}

export function calculateBrokerLevel(userData) {
    const { directReferrals = 0, teamPerformance = 0, subBrokerCounts = [] } = userData;

    let qualifiedLevel = 0;
    const evaluations = [];

    for (let level = 5; level >= 1; level--) {
        const evaluation = evaluateLevelRequirements(
            level,
            directReferrals,
            teamPerformance,
            subBrokerCounts
        );

        evaluations.push(evaluation);

        if (evaluation.qualified && qualifiedLevel === 0) {
            qualifiedLevel = level;
        }
    }

    return {
        currentLevel: qualifiedLevel,
        levelName: BROKER_LEVELS[qualifiedLevel].name,
        config: BROKER_LEVELS[qualifiedLevel],
        evaluations: evaluations.reverse(),
        userData
    };
}

export function evaluateLevelRequirements(level, directReferrals, teamPerformance, subBrokerCounts) {
    const config = BROKER_LEVELS[level];

    const directCheck = directReferrals >= config.minDirectReferrals;
    const directGap = Math.max(0, config.minDirectReferrals - directReferrals);
    const performanceCheck = teamPerformance > config.minTeamPerformance;
    const performanceGap = Math.max(0, config.minTeamPerformance - teamPerformance + 1);

    let subBrokerCheck = true;
    let subBrokerGap = 0;

    if (config.minSubBrokers > 0) {
        const requiredLevel = config.subBrokerLevel;
        const currentSubBrokers = subBrokerCounts[requiredLevel] || 0;
        subBrokerCheck = currentSubBrokers >= config.minSubBrokers;
        subBrokerGap = Math.max(0, config.minSubBrokers - currentSubBrokers);
    }

    const qualified = directCheck && performanceCheck && subBrokerCheck;

    return {
        level,
        levelName: config.name,
        qualified,
        checks: {
            directReferrals: {
                required: config.minDirectReferrals,
                current: directReferrals,
                passed: directCheck,
                gap: directGap
            },
            teamPerformance: {
                required: config.minTeamPerformance,
                current: teamPerformance,
                passed: performanceCheck,
                gap: performanceGap
            },
            subBrokers: {
                required: config.minSubBrokers,
                requiredLevel: config.subBrokerLevel,
                current: subBrokerCounts[config.subBrokerLevel] || 0,
                passed: subBrokerCheck,
                gap: subBrokerGap
            }
        },
        rewards: {
            dailyDividend: config.dailyDividend,
            monthlyIncome: config.monthlyIncome,
            dailyWLD: config.dailyWLD
        }
    };
}

export function calculateBrokerRewards(level, days = 1) {
    const config = getBrokerLevelConfig(level);

    return {
        level,
        levelName: config.name,
        days,
        rewards: {
            dailyDividend: config.dailyDividend,
            totalDividend: config.dailyDividend * days,
            dailyWLD: config.dailyWLD,
            totalWLD: config.dailyWLD * days
        },
        monthly: {
            income: config.monthlyIncome,
            days: 30,
            verification: config.dailyDividend * 30 === config.monthlyIncome
                ? '✓ Verified'
                : `⚠ Mismatch: ${config.dailyDividend * 30} vs ${config.monthlyIncome}`
        }
    };
}

export function calculateUpgradeGap(userData) {
    const currentResult = calculateBrokerLevel(userData);
    const currentLevel = currentResult.currentLevel;

    if (currentLevel >= 5) {
        return {
            currentLevel: 5,
            currentLevelName: 'Level 5 Broker',
            isMaxLevel: true,
            message: 'You have reached the highest level!'
        };
    }

    const nextLevel = currentLevel + 1;
    const nextConfig = BROKER_LEVELS[nextLevel];
    const evaluation = currentResult.evaluations[nextLevel - 1];

    return {
        currentLevel,
        currentLevelName: BROKER_LEVELS[currentLevel].name,
        nextLevel,
        nextLevelName: nextConfig.name,
        isMaxLevel: false,
        requirements: evaluation.checks,
        upgradeNeeded: {
            directReferrals: evaluation.checks.directReferrals.gap,
            teamPerformance: evaluation.checks.teamPerformance.gap,
            subBrokers: evaluation.checks.subBrokers.gap
        },
        nextLevelRewards: {
            dailyDividend: nextConfig.dailyDividend,
            monthlyIncome: nextConfig.monthlyIncome,
            dailyWLD: nextConfig.dailyWLD
        },
        rewardIncrease: {
            dailyDividend: nextConfig.dailyDividend - BROKER_LEVELS[currentLevel].dailyDividend,
            monthlyIncome: nextConfig.monthlyIncome - BROKER_LEVELS[currentLevel].monthlyIncome,
            dailyWLD: nextConfig.dailyWLD - BROKER_LEVELS[currentLevel].dailyWLD
        }
    };
}

export function checkDemotionRisk(currentLevel, userData) {
    if (currentLevel <= 0) {
        return {
            currentLevel: 0,
            atRisk: false,
            message: 'Regular user, no demotion risk'
        };
    }

    const newResult = calculateBrokerLevel(userData);
    const newLevel = newResult.currentLevel;

    if (newLevel < currentLevel) {
        return {
            currentLevel,
            newLevel,
            atRisk: true,
            willDemote: true,
            demotionLevels: currentLevel - newLevel,
            reason: 'Requirements not met',
            requirements: newResult.evaluations[currentLevel - 1].checks
        };
    }

    return {
        currentLevel,
        newLevel,
        atRisk: false,
        willDemote: false,
        message: 'Level is safe, no demotion risk'
    };
}

export function analyzeTeamStructure(teamMembers) {
    const brokerCounts = [0, 0, 0, 0, 0, 0];

    let qualifiedMembers = 0;
    let totalPerformance = 0;

    for (const member of teamMembers) {
        const purchaseAmount = member.purchaseAmount || 0;

        if (purchaseAmount >= MIN_ROBOT_PURCHASE) {
            qualifiedMembers++;
        }

        totalPerformance += purchaseAmount;

        const brokerLevel = member.brokerLevel || 0;
        if (brokerLevel >= 0 && brokerLevel <= 5) {
            brokerCounts[brokerLevel]++;
        }
    }

    return {
        totalMembers: teamMembers.length,
        qualifiedMembers,
        unqualifiedMembers: teamMembers.length - qualifiedMembers,
        totalPerformance,
        brokerCounts,
        brokerBreakdown: {
            level0: brokerCounts[0],
            level1: brokerCounts[1],
            level2: brokerCounts[2],
            level3: brokerCounts[3],
            level4: brokerCounts[4],
            level5: brokerCounts[5]
        }
    };
}

export function projectEarnings(currentLevel, projectedDays = 30) {
    const config = getBrokerLevelConfig(currentLevel);

    const dailyTotal = config.dailyDividend;
    const projectedDividend = dailyTotal * projectedDays;
    const projectedWLD = config.dailyWLD * projectedDays;

    const comparison = [];
    for (let level = 1; level <= 5; level++) {
        const levelConfig = BROKER_LEVELS[level];
        comparison.push({
            level,
            levelName: levelConfig.name,
            projectedDividend: levelConfig.dailyDividend * projectedDays,
            projectedWLD: levelConfig.dailyWLD * projectedDays,
            differenceFromCurrent: (levelConfig.dailyDividend - config.dailyDividend) * projectedDays
        });
    }

    return {
        currentLevel,
        levelName: config.name,
        projectedDays,
        projected: {
            dividendTotal: projectedDividend,
            wldTotal: projectedWLD
        },
        daily: {
            dividend: config.dailyDividend,
            wld: config.dailyWLD
        },
        comparison
    };
}
