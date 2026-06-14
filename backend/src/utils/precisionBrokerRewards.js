import { Decimal } from './precisionDecimal.js';

export const BROKER_LEVELS = {
    0: {
        name: 'Regular User',
        directRequired: 0,
        directMinAmount: 0,
        teamLevelRequired: 0,
        teamLevelCount: 0,
        teamVolume: 0,
        dailyBonus: 0,
        monthlyBonus: 0,
        dailyWldRedemption: 0
    },
    1: {
        name: 'LV1 Broker',
        directRequired: 5,
        directMinAmount: 20,
        teamLevelRequired: 0,
        teamLevelCount: 0,
        teamVolume: 1000,
        dailyBonus: 5,
        monthlyBonus: 150,
        dailyWldRedemption: 1
    },
    2: {
        name: 'LV2 Broker',
        directRequired: 10,
        directMinAmount: 100,
        teamLevelRequired: 1,
        teamLevelCount: 2,
        teamVolume: 5000,
        dailyBonus: 15,
        monthlyBonus: 450,
        dailyWldRedemption: 2
    },
    3: {
        name: 'LV3 Broker',
        directRequired: 20,
        directMinAmount: 100,
        teamLevelRequired: 2,
        teamLevelCount: 2,
        teamVolume: 20000,
        dailyBonus: 60,
        monthlyBonus: 1800,
        dailyWldRedemption: 3
    },
    4: {
        name: 'LV4 Broker',
        directRequired: 30,
        directMinAmount: 100,
        teamLevelRequired: 3,
        teamLevelCount: 2,
        teamVolume: 80000,
        dailyBonus: 300,
        monthlyBonus: 9000,
        dailyWldRedemption: 5
    },
    5: {
        name: 'LV5 Broker',
        directRequired: 50,
        directMinAmount: 100,
        teamLevelRequired: 4,
        teamLevelCount: 2,
        teamVolume: 200000,
        dailyBonus: 1000,
        monthlyBonus: 30000,
        dailyWldRedemption: 10
    }
};

export function calculateBrokerLevel(userData) {
    const {
        directReferrals = [],
        teamVolume = 0,
        subordinateLevels = {},
        teamMembers = 0
    } = userData;

    const MIN_TEAM_MEMBERS_BY_LEVEL = { 1: 5, 2: 20, 3: 60, 4: 150, 5: 350 };

    let qualifiedLevel = 0;
    const qualificationDetails = [];

    for (let level = 5; level >= 1; level--) {
        const config = BROKER_LEVELS[level];

        const teamMembersOk = new Decimal(teamMembers || 0).gte(new Decimal(MIN_TEAM_MEMBERS_BY_LEVEL[level] || 0));
        const qualifiedDirects = directReferrals.filter(ref =>
            new Decimal(ref.totalInvestment || 0).gte(new Decimal(config.directMinAmount))
        );
        const directOk = qualifiedDirects.length >= config.directRequired;
        const volumeOk = new Decimal(teamVolume).gte(new Decimal(config.teamVolume));
        const subLevelOk = config.teamLevelRequired === 0 ||
            (subordinateLevels[config.teamLevelRequired] || 0) >= config.teamLevelCount;
        const qualified = teamMembersOk && directOk && volumeOk && subLevelOk;

        qualificationDetails.push({
            level,
            name: config.name,
            qualified,
            checks: {
                teamMembers: {
                    required: MIN_TEAM_MEMBERS_BY_LEVEL[level] || 0,
                    actual: teamMembers,
                    passed: teamMembersOk
                },
                directReferrals: {
                    required: config.directRequired,
                    actual: qualifiedDirects.length,
                    minAmount: config.directMinAmount,
                    passed: directOk
                },
                teamVolume: {
                    required: config.teamVolume,
                    actual: teamVolume,
                    passed: volumeOk
                },
                subordinateLevels: {
                    requiredLevel: config.teamLevelRequired,
                    requiredCount: config.teamLevelCount,
                    actualCount: subordinateLevels[config.teamLevelRequired] || 0,
                    passed: subLevelOk
                }
            },
            rewards: qualified ? {
                dailyBonus: config.dailyBonus,
                monthlyBonus: config.monthlyBonus,
                dailyWldRedemption: config.dailyWldRedemption
            } : null
        });

        if (qualified && qualifiedLevel === 0) {
            qualifiedLevel = level;
        }
    }

    return {
        currentLevel: qualifiedLevel,
        levelName: BROKER_LEVELS[qualifiedLevel].name,
        rewards: BROKER_LEVELS[qualifiedLevel],
        details: qualificationDetails.reverse()
    };
}

export function calculateDailyBonus(level) {
    const config = BROKER_LEVELS[level] || BROKER_LEVELS[0];
    return new Decimal(config.dailyBonus || 0).toFixed(4);
}

export function calculateMonthlyBonus(level) {
    const config = BROKER_LEVELS[level] || BROKER_LEVELS[0];
    return new Decimal(config.monthlyBonus || 0).toFixed(4);
}

export function getDailyWldLimit(level) {
    const config = BROKER_LEVELS[level] || BROKER_LEVELS[0];
    return config.dailyWldRedemption || 0;
}
