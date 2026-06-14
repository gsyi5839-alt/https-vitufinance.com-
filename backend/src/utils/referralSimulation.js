import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';

function gaussianRandom(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

function monteCarloSimulation(params, type = 'CEX') {
    const {
        avgReferrals = 3,
        referralSuccessRate = 0.7,
        avgProfit = 100,
        profitVolatility = 30,
        simulations = 1000
    } = params;

    const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
    const maxLevel = rates.length;
    const results = [];

    for (let sim = 0; sim < simulations; sim++) {
        let totalReward = 0;
        let currentLevelUsers = 1;

        for (let level = 1; level <= maxLevel; level++) {
            let nextLevelUsers = 0;
            for (let i = 0; i < currentLevelUsers; i++) {
                const referrals = Math.max(0, Math.round(
                    avgReferrals * (Math.random() < referralSuccessRate ? 1 : 0.3)
                ));
                nextLevelUsers += referrals;
            }

            for (let i = 0; i < nextLevelUsers; i++) {
                const profit = Math.max(0, gaussianRandom(avgProfit, profitVolatility));
                totalReward += profit * rates[level - 1];
            }

            currentLevelUsers = nextLevelUsers;
            if (currentLevelUsers === 0) break;
        }

        results.push(totalReward);
    }

    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / simulations;
    const variance = results.reduce(
        (sum, result) => sum + Math.pow(result - mean, 2),
        0
    ) / simulations;
    const stdDev = Math.sqrt(variance);
    const median = results[Math.floor(simulations / 2)];
    const p5 = results[Math.floor(simulations * 0.05)];
    const p95 = results[Math.floor(simulations * 0.95)];

    return {
        type,
        params,
        simulations,
        statistics: {
            mean,
            median,
            stdDev,
            min: results[0],
            max: results[results.length - 1],
            percentile5: p5,
            percentile95: p95,
            confidenceInterval: `[${p5.toFixed(2)}, ${p95.toFixed(2)}]`
        },
        algorithm: '蒙特卡洛模拟',
        interpretation: `在${simulations}次模拟中，预期收益为 ${mean.toFixed(2)} USDT，90%置信区间为 [${p5.toFixed(2)}, ${p95.toFixed(2)}] USDT`
    };
}

export {
    monteCarloSimulation
};
