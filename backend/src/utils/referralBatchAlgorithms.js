import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';

function optimizeReferralAllocation(totalSlots, avgProfit, type = 'CEX') {
    const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
    const maxLevel = rates.length;
    const allocation = [];
    let remainingSlots = totalSlots;
    let totalExpectedReward = 0;

    const sortedLevels = rates
        .map((rate, index) => ({ level: index + 1, rate }))
        .sort((a, b) => b.rate - a.rate);

    for (const { level, rate } of sortedLevels) {
        if (remainingSlots <= 0) break;

        const slotsForLevel = Math.ceil(remainingSlots / maxLevel);
        const actualSlots = Math.min(slotsForLevel, remainingSlots);
        const expectedReward = actualSlots * avgProfit * rate;

        allocation.push({
            level,
            rate,
            ratePercent: rate * 100,
            slots: actualSlots,
            expectedReward
        });

        totalExpectedReward += expectedReward;
        remainingSlots -= actualSlots;
    }

    return {
        type,
        totalSlots,
        avgProfit,
        allocation: allocation.sort((a, b) => a.level - b.level),
        totalExpectedReward,
        algorithm: '贪心动态规划',
        note: '优先分配高比例层级'
    };
}

function batchCalculateRewards(profitMatrix, type = 'CEX') {
    const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
    const maxLevel = rates.length;
    const results = [];

    for (let i = 0; i < profitMatrix.length; i++) {
        const userProfits = profitMatrix[i];
        let totalReward = 0;
        const levelRewards = [];

        for (let j = 0; j < Math.min(userProfits.length, maxLevel); j++) {
            const reward = userProfits[j] * rates[j];
            totalReward += reward;
            levelRewards.push({
                level: j + 1,
                profit: userProfits[j],
                rate: rates[j],
                reward
            });
        }

        results.push({
            userIndex: i,
            levelRewards,
            totalReward
        });
    }

    const grandTotal = results.reduce((sum, result) => sum + result.totalReward, 0);

    return {
        type,
        userCount: profitMatrix.length,
        results,
        grandTotal,
        algorithm: '矩阵向量乘法',
        formula: 'R = P × r'
    };
}

export {
    optimizeReferralAllocation,
    batchCalculateRewards
};
