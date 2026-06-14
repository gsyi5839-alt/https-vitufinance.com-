import { BROKER_LEVELS } from './teamMathConfig.js';
import {
    calculateBrokerLevel,
    calculateUpgradeGap,
    projectEarnings
} from './teamMathCore.js';

export function deriveTeamFormulas() {
    return {
        title: 'Team Broker Level Math Model',

        levelDetermination: {
            formula: 'L = max{n : C_direct(n) ∧ C_perf(n) ∧ C_broker(n)}',
            description: 'User level = highest level meeting all conditions',
            conditions: {
                'C_direct(n)': 'directReferrals >= minDirectReferrals[n]',
                'C_perf(n)': 'teamPerformance > minTeamPerformance[n]',
                'C_broker(n)': 'subBrokerCount[n-1] >= 2 (for n >= 2)'
            }
        },

        rewardCalculation: {
            daily: 'R_daily = dailyDividend[L]',
            monthly: 'R_monthly = dailyDividend[L] × 30',
            wld: 'WLD_daily = dailyWLD[L]',
            total: 'R_total(days) = R_daily × days'
        },

        levelTable: BROKER_LEVELS.slice(1).map(config => ({
            level: config.level,
            name: config.name,
            directRequired: `≥ ${config.minDirectReferrals}`,
            performanceRequired: `> ${config.minTeamPerformance.toLocaleString()} USDT`,
            subBrokerRequired: config.minSubBrokers > 0
                ? `≥ ${config.minSubBrokers} L${config.subBrokerLevel} brokers`
                : 'None',
            rewards: `${config.dailyDividend}/day, ${config.monthlyIncome}/month, ${config.dailyWLD} WLD/day`
        }))
    };
}

export function validateLevelConfiguration() {
    const issues = [];

    for (let i = 1; i <= 5; i++) {
        const config = BROKER_LEVELS[i];

        const expectedMonthly = config.dailyDividend * 30;
        if (expectedMonthly !== config.monthlyIncome) {
            issues.push({
                level: i,
                issue: `Monthly income mismatch: ${expectedMonthly} vs ${config.monthlyIncome}`,
                severity: 'warning'
            });
        }

        if (i > 1) {
            const prevConfig = BROKER_LEVELS[i - 1];
            if (config.minDirectReferrals <= prevConfig.minDirectReferrals) {
                issues.push({
                    level: i,
                    issue: 'Direct referrals not increasing',
                    severity: 'error'
                });
            }
            if (config.minTeamPerformance <= prevConfig.minTeamPerformance) {
                issues.push({
                    level: i,
                    issue: 'Team performance not increasing',
                    severity: 'error'
                });
            }
        }
    }

    return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        summary: issues.length === 0
            ? '✓ All level configs validated'
            : `⚠ Found ${issues.length} issues`
    };
}

export function generateTeamReport(userData = null) {
    const report = {
        title: 'Team Broker Level System Analysis Report',
        timestamp: new Date().toISOString(),

        configValidation: validateLevelConfiguration(),
        formulas: deriveTeamFormulas(),

        levelConfigs: BROKER_LEVELS.slice(1).map(config => ({
            level: config.level,
            name: config.name,
            requirements: {
                directReferrals: config.minDirectReferrals,
                teamPerformance: config.minTeamPerformance,
                subBrokers: config.minSubBrokers,
                subBrokerLevel: config.subBrokerLevel
            },
            rewards: {
                dailyDividend: config.dailyDividend,
                monthlyIncome: config.monthlyIncome,
                dailyWLD: config.dailyWLD
            }
        }))
    };

    if (userData) {
        report.userAnalysis = {
            levelEvaluation: calculateBrokerLevel(userData),
            upgradeGap: calculateUpgradeGap(userData),
            earningsProjection: projectEarnings(
                calculateBrokerLevel(userData).currentLevel,
                30
            )
        };
    }

    return report;
}
