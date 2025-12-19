/**
 * 前端推荐奖励计算工具（可选）
 * 
 * 用途：帮助用户预估推荐奖励收益
 * 注意：实际奖励由后端计算和发放，这里仅供展示参考
 */

// ============================================================================
// 奖励比例配置（与后端保持一致）
// ============================================================================

/**
 * CEX机器人推荐奖励比例（8级）
 * 总计：30% + 10% + 5% + 1%×5 = 50%
 */
export const CEX_RATES = [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01];

/**
 * DEX机器人启动金额奖励比例（3级）
 * 总计：5% + 3% + 2% = 10%
 */
export const DEX_RATES = [0.05, 0.03, 0.02];

// ============================================================================
// 计算函数
// ============================================================================

/**
 * 计算CEX推荐预期奖励
 * 
 * @param {number} profit - 下级总量化收益
 * @param {number} level - 推荐级别 (1-8)
 * @returns {Object} 奖励计算结果
 */
export function calculateCexReward(profit, level = 1) {
    if (level < 1 || level > 8) {
        return { reward: 0, rate: 0, error: '无效的级别' };
    }
    
    const rate = CEX_RATES[level - 1];
    const reward = profit * rate;
    
    return {
        profit,                           // 收益金额
        level,                            // 推荐级别
        rate,                             // 奖励比例
        ratePercent: rate * 100,          // 奖励百分比
        reward: parseFloat(reward.toFixed(4)), // 奖励金额
        formula: `${profit} × ${rate * 100}% = ${reward.toFixed(4)} USDT`
    };
}

/**
 * 计算DEX推荐预期奖励
 * 
 * @param {number} amount - 下级启动金额
 * @param {number} level - 推荐级别 (1-3)
 * @returns {Object} 奖励计算结果
 */
export function calculateDexReward(amount, level = 1) {
    if (level < 1 || level > 3) {
        return { reward: 0, rate: 0, error: '无效的级别' };
    }
    
    const rate = DEX_RATES[level - 1];
    const reward = amount * rate;
    
    return {
        amount,                           // 启动金额
        level,                            // 推荐级别
        rate,                             // 奖励比例
        ratePercent: rate * 100,          // 奖励百分比
        reward: parseFloat(reward.toFixed(4)), // 奖励金额
        formula: `${amount} × ${rate * 100}% = ${reward.toFixed(4)} USDT`
    };
}

/**
 * 计算所有级别的CEX奖励汇总
 * 
 * @param {Array<number>} levelProfits - 各级别的收益数组
 * @returns {Object} 汇总结果
 */
export function calculateAllCexRewards(levelProfits) {
    const details = [];
    let totalReward = 0;
    
    for (let i = 0; i < Math.min(levelProfits.length, 8); i++) {
        const profit = levelProfits[i] || 0;
        const rate = CEX_RATES[i];
        const reward = profit * rate;
        totalReward += reward;
        
        details.push({
            level: i + 1,
            profit,
            rate,
            ratePercent: rate * 100,
            reward: parseFloat(reward.toFixed(4))
        });
    }
    
    return {
        details,
        totalReward: parseFloat(totalReward.toFixed(4)),
        totalProfit: levelProfits.reduce((a, b) => a + (b || 0), 0)
    };
}

/**
 * 计算所有级别的DEX奖励汇总
 * 
 * @param {Array<number>} levelAmounts - 各级别的启动金额数组
 * @returns {Object} 汇总结果
 */
export function calculateAllDexRewards(levelAmounts) {
    const details = [];
    let totalReward = 0;
    
    for (let i = 0; i < Math.min(levelAmounts.length, 3); i++) {
        const amount = levelAmounts[i] || 0;
        const rate = DEX_RATES[i];
        const reward = amount * rate;
        totalReward += reward;
        
        details.push({
            level: i + 1,
            amount,
            rate,
            ratePercent: rate * 100,
            reward: parseFloat(reward.toFixed(4))
        });
    }
    
    return {
        details,
        totalReward: parseFloat(totalReward.toFixed(4)),
        totalAmount: levelAmounts.reduce((a, b) => a + (b || 0), 0)
    };
}

/**
 * 预估推荐链潜力
 * 
 * 假设每人平均推荐 k 个人，计算8级潜在收益
 * 
 * @param {number} avgProfit - 平均每人收益
 * @param {number} avgReferrals - 平均推荐人数
 * @returns {Object} 潜力分析
 */
export function estimateReferralPotential(avgProfit, avgReferrals) {
    const analysis = [];
    let totalPotential = 0;
    
    for (let level = 1; level <= 8; level++) {
        // 第n级人数 = k^(n-1)
        const peopleAtLevel = Math.pow(avgReferrals, level - 1);
        const rate = CEX_RATES[level - 1];
        const levelReward = peopleAtLevel * avgProfit * rate;
        totalPotential += levelReward;
        
        analysis.push({
            level,
            people: Math.round(peopleAtLevel),
            rate: rate * 100,
            reward: parseFloat(levelReward.toFixed(2))
        });
    }
    
    return {
        params: { avgProfit, avgReferrals },
        analysis,
        totalPotential: parseFloat(totalPotential.toFixed(2)),
        summary: `假设每人推荐${avgReferrals}人，平均收益${avgProfit}USDT，预计总奖励 ${totalPotential.toFixed(2)} USDT`
    };
}

/**
 * 格式化金额显示
 * 
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的金额
 */
export function formatReward(amount, decimals = 4) {
    return parseFloat(amount).toFixed(decimals);
}

