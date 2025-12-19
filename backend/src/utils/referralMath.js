/**
 * 推荐奖励数学模型 - Referral Rewards Mathematical Model
 * 
 * 本模块提供推荐奖励系统的数学计算、分析和验证工具
 * 
 * 数学公式：
 * CEX: R_n = P × r_n，其中 r = [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01]
 * DEX: R_n = A × r_n，其中 r = [0.05, 0.03, 0.02]
 */

// ============================================================================
// 常量定义 - 奖励比例配置
// ============================================================================

/**
 * CEX机器人推荐奖励比例（8级）
 * 总计：30% + 10% + 5% + 1%×5 = 50%
 */
const CEX_REFERRAL_RATES = [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01];

/**
 * DEX机器人启动金额奖励比例（3级）
 * 总计：5% + 3% + 2% = 10%
 */
const DEX_REFERRAL_RATES = [0.05, 0.03, 0.02];

// ============================================================================
// 核心数学计算函数
// ============================================================================

/**
 * 计算单个级别的奖励金额
 * 公式: R = Amount × Rate
 * 
 * @param {number} amount - 基础金额（收益或启动金额）
 * @param {number} rate - 奖励比例（0-1之间的小数）
 * @returns {number} 奖励金额
 */
function calculateLevelReward(amount, rate) {
    return amount * rate;
}

/**
 * 计算CEX机器人所有级别的推荐奖励分配
 * 
 * 数学模型：
 * 总奖励 = Σ(P × r_i)，i = 1 to 8
 * 其中 P = 量化收益，r_i = 第i级奖励比例
 * 
 * @param {number} profit - 量化收益金额
 * @returns {Object} 奖励分配详情
 */
function calculateCexRewards(profit) {
    const rewards = [];
    let totalDistributed = 0;

    for (let level = 1; level <= 8; level++) {
        const rate = CEX_REFERRAL_RATES[level - 1];
        const rewardAmount = calculateLevelReward(profit, rate);
        totalDistributed += rewardAmount;

        rewards.push({
            level,                          // 级别
            rate: rate,                     // 比例（小数）
            ratePercent: rate * 100,        // 比例（百分比）
            rewardAmount: rewardAmount,     // 奖励金额
            formula: `${profit} × ${rate} = ${rewardAmount.toFixed(4)}` // 计算公式
        });
    }

    return {
        type: 'CEX',                        // 机器人类型
        baseAmount: profit,                 // 基础金额（量化收益）
        totalLevels: 8,                     // 总级别数
        rewards,                            // 各级奖励详情
        totalDistributed,                   // 总分配金额
        totalDistributedPercent: (totalDistributed / profit * 100).toFixed(2), // 总分配百分比
        netProfit: profit - totalDistributed, // 用户净收益（平台保留）
        summary: `量化收益 ${profit} USDT，分配给8级推荐人共 ${totalDistributed.toFixed(4)} USDT (${(totalDistributed / profit * 100).toFixed(2)}%)`
    };
}

/**
 * 计算DEX机器人所有级别的推荐奖励分配
 * 
 * 数学模型：
 * 总奖励 = Σ(A × r_i)，i = 1 to 3
 * 其中 A = 启动金额，r_i = 第i级奖励比例
 * 
 * @param {number} purchaseAmount - 启动金额
 * @returns {Object} 奖励分配详情
 */
function calculateDexRewards(purchaseAmount) {
    const rewards = [];
    let totalDistributed = 0;

    for (let level = 1; level <= 3; level++) {
        const rate = DEX_REFERRAL_RATES[level - 1];
        const rewardAmount = calculateLevelReward(purchaseAmount, rate);
        totalDistributed += rewardAmount;

        rewards.push({
            level,                          // 级别
            rate: rate,                     // 比例（小数）
            ratePercent: rate * 100,        // 比例（百分比）
            rewardAmount: rewardAmount,     // 奖励金额
            formula: `${purchaseAmount} × ${rate} = ${rewardAmount.toFixed(4)}` // 计算公式
        });
    }

    return {
        type: 'DEX',                        // 机器人类型
        baseAmount: purchaseAmount,         // 基础金额（启动金额）
        totalLevels: 3,                     // 总级别数
        rewards,                            // 各级奖励详情
        totalDistributed,                   // 总分配金额
        totalDistributedPercent: (totalDistributed / purchaseAmount * 100).toFixed(2), // 总分配百分比
        summary: `启动金额 ${purchaseAmount} USDT，分配给3级推荐人共 ${totalDistributed.toFixed(4)} USDT (${(totalDistributed / purchaseAmount * 100).toFixed(2)}%)`
    };
}

// ============================================================================
// 高级数学分析函数
// ============================================================================

/**
 * 计算推荐链的累积收益潜力
 * 
 * 数学模型 - 几何级数分析：
 * 假设每个人平均推荐 k 个人，则第n级有 k^(n-1) 个人
 * 每级收益 = k^(n-1) × 平均收益 × 该级奖励比例
 * 
 * @param {number} avgProfit - 平均每人量化收益
 * @param {number} avgReferrals - 平均每人推荐人数
 * @param {string} type - 'CEX' 或 'DEX'
 * @returns {Object} 累积收益分析
 */
function analyzeReferralChainPotential(avgProfit, avgReferrals, type = 'CEX') {
    const rates = type === 'CEX' ? CEX_REFERRAL_RATES : DEX_REFERRAL_RATES;
    const maxLevel = rates.length;
    const analysis = [];
    let totalPotentialReward = 0;

    for (let level = 1; level <= maxLevel; level++) {
        // 第n级人数 = k^(n-1)，其中 k = 平均推荐人数
        const peopleAtLevel = Math.pow(avgReferrals, level - 1);
        const rate = rates[level - 1];
        
        // 该级别总收益 = 人数 × 平均收益 × 比例
        const levelTotalProfit = peopleAtLevel * avgProfit;
        const rewardFromLevel = levelTotalProfit * rate;
        totalPotentialReward += rewardFromLevel;

        analysis.push({
            level,
            peopleAtLevel: Math.round(peopleAtLevel),
            rate: rate,
            ratePercent: rate * 100,
            levelTotalProfit: levelTotalProfit,
            rewardFromLevel: rewardFromLevel,
            formula: `${Math.round(peopleAtLevel)}人 × ${avgProfit} × ${rate * 100}% = ${rewardFromLevel.toFixed(4)}`
        });
    }

    return {
        type,
        avgProfit,
        avgReferrals,
        maxLevel,
        analysis,
        totalPotentialReward,
        summary: `假设每人推荐${avgReferrals}人，每人收益${avgProfit}USDT，您可获得总奖励 ${totalPotentialReward.toFixed(4)} USDT`
    };
}

/**
 * 验证奖励分配的数学正确性
 * 
 * 验证规则：
 * 1. CEX总分配比例必须等于50%
 * 2. DEX总分配比例必须等于10%
 * 3. 各级奖励金额 = 基础金额 × 比例
 * 
 * @returns {Object} 验证结果
 */
function validateRewardConfiguration() {
    // 计算CEX总比例
    const cexTotalRate = CEX_REFERRAL_RATES.reduce((sum, rate) => sum + rate, 0);
    const cexExpectedRate = 0.50; // 期望50%

    // 计算DEX总比例
    const dexTotalRate = DEX_REFERRAL_RATES.reduce((sum, rate) => sum + rate, 0);
    const dexExpectedRate = 0.10; // 期望10%

    // 精度验证（考虑浮点数误差）
    const tolerance = 0.0001;
    const cexValid = Math.abs(cexTotalRate - cexExpectedRate) < tolerance;
    const dexValid = Math.abs(dexTotalRate - dexExpectedRate) < tolerance;

    return {
        cex: {
            rates: CEX_REFERRAL_RATES,
            totalRate: cexTotalRate,
            totalPercent: (cexTotalRate * 100).toFixed(2) + '%',
            expected: cexExpectedRate * 100 + '%',
            valid: cexValid,
            message: cexValid ? '✓ CEX奖励配置正确' : '✗ CEX奖励配置错误'
        },
        dex: {
            rates: DEX_REFERRAL_RATES,
            totalRate: dexTotalRate,
            totalPercent: (dexTotalRate * 100).toFixed(2) + '%',
            expected: dexExpectedRate * 100 + '%',
            valid: dexValid,
            message: dexValid ? '✓ DEX奖励配置正确' : '✗ DEX奖励配置错误'
        },
        allValid: cexValid && dexValid,
        summary: cexValid && dexValid 
            ? '✓ 所有奖励配置验证通过' 
            : '✗ 部分奖励配置存在问题'
    };
}

/**
 * 计算用户作为推荐人可获得的预期收益
 * 
 * 场景：用户推荐了一批下级，计算预期奖励收入
 * 
 * @param {Array} downlineData - 下级数据数组 [{level: 1, count: 10, avgProfit: 100}, ...]
 * @param {string} type - 'CEX' 或 'DEX'
 * @returns {Object} 预期收益分析
 */
function calculateExpectedRewards(downlineData, type = 'CEX') {
    const rates = type === 'CEX' ? CEX_REFERRAL_RATES : DEX_REFERRAL_RATES;
    const calculations = [];
    let totalExpectedReward = 0;

    for (const item of downlineData) {
        const { level, count, avgProfit } = item;
        
        if (level < 1 || level > rates.length) {
            continue; // 跳过无效级别
        }

        const rate = rates[level - 1];
        const totalLevelProfit = count * avgProfit;
        const expectedReward = totalLevelProfit * rate;
        totalExpectedReward += expectedReward;

        calculations.push({
            level,
            count,
            avgProfit,
            rate: rate,
            ratePercent: rate * 100,
            totalLevelProfit,
            expectedReward,
            formula: `${count}人 × ${avgProfit} × ${rate * 100}% = ${expectedReward.toFixed(4)}`
        });
    }

    return {
        type,
        calculations,
        totalExpectedReward,
        summary: `预期总奖励: ${totalExpectedReward.toFixed(4)} USDT`
    };
}

/**
 * 生成完整的数学模型报告
 * 
 * @param {number} testAmount - 测试金额
 * @returns {Object} 完整报告
 */
function generateMathReport(testAmount = 1000) {
    return {
        title: '推荐奖励系统数学模型分析报告',
        timestamp: new Date().toISOString(),
        
        // 配置验证
        configValidation: validateRewardConfiguration(),
        
        // CEX示例计算
        cexExample: calculateCexRewards(testAmount),
        
        // DEX示例计算
        dexExample: calculateDexRewards(testAmount),
        
        // 推荐链潜力分析（假设每人推荐3人）
        chainAnalysis: {
            cex: analyzeReferralChainPotential(testAmount, 3, 'CEX'),
            dex: analyzeReferralChainPotential(testAmount, 3, 'DEX')
        },
        
        // 数学公式说明
        formulas: {
            cex: {
                description: 'CEX机器人量化收益奖励',
                formula: 'R_n = P × r_n',
                variables: {
                    'R_n': '第n级推荐人获得的奖励',
                    'P': '用户的量化收益（profit）',
                    'r_n': '第n级的奖励比例'
                },
                rates: 'r = [30%, 10%, 5%, 1%, 1%, 1%, 1%, 1%]',
                totalRate: '总分配比例 = Σr_n = 50%'
            },
            dex: {
                description: 'DEX机器人启动金额奖励',
                formula: 'R_n = A × r_n',
                variables: {
                    'R_n': '第n级推荐人获得的奖励',
                    'A': '用户的启动金额（purchase amount）',
                    'r_n': '第n级的奖励比例'
                },
                rates: 'r = [5%, 3%, 2%]',
                totalRate: '总分配比例 = Σr_n = 10%'
            }
        }
    };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化金额显示
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的金额
 */
function formatAmount(amount, decimals = 4) {
    return amount.toFixed(decimals);
}

/**
 * 格式化百分比显示
 * @param {number} rate - 比例（0-1之间）
 * @returns {string} 格式化后的百分比
 */
function formatPercent(rate) {
    return (rate * 100).toFixed(2) + '%';
}

// ============================================================================
// 导出模块（ES Module）
// ============================================================================

export {
    // 常量
    CEX_REFERRAL_RATES,
    DEX_REFERRAL_RATES,
    
    // 核心计算函数
    calculateLevelReward,
    calculateCexRewards,
    calculateDexRewards,
    
    // 高级分析函数
    analyzeReferralChainPotential,
    validateRewardConfiguration,
    calculateExpectedRewards,
    generateMathReport,
    
    // 工具函数
    formatAmount,
    formatPercent
};

// ============================================================================
// 命令行测试（直接运行本文件时执行）
// ============================================================================

// 检测是否作为主模块运行
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    console.log('\n========================================');
    console.log('    推荐奖励系统数学模型测试');
    console.log('========================================\n');

    // 1. 验证配置
    console.log('1. 配置验证:');
    const validation = validateRewardConfiguration();
    console.log('   CEX:', validation.cex.message, validation.cex.totalPercent);
    console.log('   DEX:', validation.dex.message, validation.dex.totalPercent);
    console.log('');

    // 2. CEX奖励计算示例
    console.log('2. CEX奖励计算 (量化收益 1000 USDT):');
    const cexResult = calculateCexRewards(1000);
    cexResult.rewards.forEach(r => {
        console.log(`   ${r.level}级: ${r.formula}`);
    });
    console.log('   ' + cexResult.summary);
    console.log('');

    // 3. DEX奖励计算示例
    console.log('3. DEX奖励计算 (启动金额 1000 USDT):');
    const dexResult = calculateDexRewards(1000);
    dexResult.rewards.forEach(r => {
        console.log(`   ${r.level}级: ${r.formula}`);
    });
    console.log('   ' + dexResult.summary);
    console.log('');

    // 4. 推荐链潜力分析
    console.log('4. 推荐链潜力分析 (假设每人推荐3人, 收益100 USDT):');
    const chainResult = analyzeReferralChainPotential(100, 3, 'CEX');
    chainResult.analysis.forEach(a => {
        console.log(`   ${a.level}级: ${a.formula}`);
    });
    console.log('   ' + chainResult.summary);
    console.log('');

    // 5. 预期收益计算
    console.log('5. 预期收益计算示例:');
    const expectedResult = calculateExpectedRewards([
        { level: 1, count: 10, avgProfit: 100 },  // 10个直推，每人收益100
        { level: 2, count: 30, avgProfit: 80 },   // 30个二级，每人收益80
        { level: 3, count: 50, avgProfit: 60 }    // 50个三级，每人收益60
    ], 'CEX');
    expectedResult.calculations.forEach(c => {
        console.log(`   ${c.level}级: ${c.formula}`);
    });
    console.log('   ' + expectedResult.summary);

    console.log('\n========================================\n');
}

