import { Decimal } from './precisionDecimal.js';

export const REWARD_RATES = {
    CEX: [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01],
    DEX_LAUNCH: [0.05, 0.03, 0.02],
    DEX_PROFIT: [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01]
};

export function calculateLevelReward(amount, level, type = 'CEX') {
    const rates = REWARD_RATES[type] || REWARD_RATES.CEX;

    if (level < 1 || level > rates.length) {
        return { reward: '0.0000', rate: 0, formula: 'Invalid level' };
    }

    const rate = rates[level - 1];
    const amountDec = new Decimal(amount || 0);
    const reward = amountDec.times(new Decimal(rate));

    return {
        reward: reward.toFixed(4),
        rate: rate,
        ratePercent: new Decimal(rate).times(100).toFixed(1) + '%',
        formula: `${amount} × ${rate} = ${reward.toFixed(4)}`
    };
}

export function calculateAllLevelRewards(amount, type = 'CEX') {
    const rates = REWARD_RATES[type] || REWARD_RATES.CEX;
    const rewards = [];
    let totalReward = new Decimal(0);

    for (let level = 1; level <= rates.length; level++) {
        const result = calculateLevelReward(amount, level, type);
        rewards.push({
            level,
            ...result
        });
        totalReward = totalReward.plus(new Decimal(result.reward));
    }

    const amountDec = new Decimal(amount || 0);
    const totalRate = rates.reduce((sum, r) => sum + r, 0);

    return {
        type,
        baseAmount: amount,
        totalLevels: rates.length,
        rewards,
        totalReward: totalReward.toFixed(4),
        totalRatePercent: new Decimal(totalRate).times(100).toFixed(1) + '%',
        netAmount: amountDec.minus(totalReward).toFixed(4)
    };
}
