export const TEAM_SAFETY_LIMITS = {
    MAX_DAILY_DIVIDEND: 1500,
    MAX_DAILY_WLD: 15,
    MAX_TOTAL_DAILY_PAYOUT: 50000
};

export const BROKER_LEVELS = [
    {
        level: 0,
        name: 'Regular User',
        minDirectReferrals: 0,
        minPurchaseAmount: 0,
        minSubBrokers: 0,
        subBrokerLevel: 0,
        minTeamPerformance: 0,
        dailyDividend: 0,
        monthlyIncome: 0,
        dailyWLD: 0
    },
    {
        level: 1,
        name: 'LV 1 Broker',
        minDirectReferrals: 5,
        minPurchaseAmount: 20,
        minSubBrokers: 0,
        subBrokerLevel: 0,
        minTeamPerformance: 1000,
        dailyDividend: 5,
        monthlyIncome: 150,
        dailyWLD: 1
    },
    {
        level: 2,
        name: 'LV 2 Broker',
        minDirectReferrals: 10,
        minPurchaseAmount: 100,
        minSubBrokers: 2,
        subBrokerLevel: 1,
        minTeamPerformance: 5000,
        dailyDividend: 15,
        monthlyIncome: 450,
        dailyWLD: 2
    },
    {
        level: 3,
        name: 'LV 3 Broker',
        minDirectReferrals: 20,
        minPurchaseAmount: 100,
        minSubBrokers: 2,
        subBrokerLevel: 2,
        minTeamPerformance: 20000,
        dailyDividend: 60,
        monthlyIncome: 1800,
        dailyWLD: 3
    },
    {
        level: 4,
        name: 'LV 4 Broker',
        minDirectReferrals: 30,
        minPurchaseAmount: 100,
        minSubBrokers: 2,
        subBrokerLevel: 3,
        minTeamPerformance: 80000,
        dailyDividend: 300,
        monthlyIncome: 9000,
        dailyWLD: 5
    },
    {
        level: 5,
        name: 'LV 5 Broker',
        minDirectReferrals: 50,
        minPurchaseAmount: 100,
        minSubBrokers: 2,
        subBrokerLevel: 4,
        minTeamPerformance: 200000,
        dailyDividend: 1000,
        monthlyIncome: 30000,
        dailyWLD: 10
    }
];

export const MIN_ROBOT_PURCHASE_LV1 = 20;
export const MIN_ROBOT_PURCHASE_LV2_5 = 100;
export const MIN_ROBOT_PURCHASE = 20;
