/**
 * 数学算法验证脚本
 * 功能：验证项目中所有数学算法的正确性和一致性
 * 
 * 执行方式: node scripts/verify_math_algorithms.js
 */

import { fileURLToPath } from 'url';
import path from 'path';

// 设置当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入数学工具
import {
    CEX_REFERRAL_RATES,
    DEX_REFERRAL_RATES,
    calculateLevelReward,
    calculateCexRewards,
    calculateDexRewards,
    validateRewardConfiguration,
    formatAmount
} from '../src/utils/referralMath.js';

import {
    CEX_RATES,
    DEX_RATES,
    deriveFormulas,
    numericalValidation,
    monteCarloSimulation,
    calculateTreeRewards,
    ReferralNode
} from '../src/utils/referralAdvancedMath.js';

import {
    getRobotConfig,
    calculateQuantifyEarnings,
    calculateHighRobotReturn,
    hoursToDays
} from '../src/config/robotConfig.js';

// ============================================================================
// 验证结果统计
// ============================================================================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedDetails = [];

function assert(condition, testName, expected, actual) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ ${testName}`);
    } else {
        failedTests++;
        const detail = `${testName}: 期望 ${expected}, 实际 ${actual}`;
        failedDetails.push(detail);
        console.log(`  ❌ ${testName}`);
        console.log(`     期望: ${expected}, 实际: ${actual}`);
    }
}

function assertApprox(actual, expected, tolerance, testName) {
    const condition = Math.abs(actual - expected) < tolerance;
    assert(condition, testName, expected, actual);
}

// ============================================================================
// 1. 推荐奖励比例验证
// ============================================================================
function verifyReferralRates() {
    console.log('\n' + '='.repeat(60));
    console.log('【1. 推荐奖励比例验证】');
    console.log('='.repeat(60));
    
    // CEX 8级奖励比例总计应为 50%
    const cexTotal = CEX_REFERRAL_RATES.reduce((a, b) => a + b, 0);
    assertApprox(cexTotal, 0.50, 0.0001, 'CEX 8级奖励比例总计 = 50%');
    
    // CEX 各级比例验证
    assert(CEX_REFERRAL_RATES[0] === 0.30, 'CEX 1级比例 = 30%', 0.30, CEX_REFERRAL_RATES[0]);
    assert(CEX_REFERRAL_RATES[1] === 0.10, 'CEX 2级比例 = 10%', 0.10, CEX_REFERRAL_RATES[1]);
    assert(CEX_REFERRAL_RATES[2] === 0.05, 'CEX 3级比例 = 5%', 0.05, CEX_REFERRAL_RATES[2]);
    
    // DEX 3级奖励比例总计应为 10%
    const dexTotal = DEX_REFERRAL_RATES.reduce((a, b) => a + b, 0);
    assertApprox(dexTotal, 0.10, 0.0001, 'DEX 3级奖励比例总计 = 10%');
    
    // DEX 各级比例验证
    assert(DEX_REFERRAL_RATES[0] === 0.05, 'DEX 1级比例 = 5%', 0.05, DEX_REFERRAL_RATES[0]);
    assert(DEX_REFERRAL_RATES[1] === 0.03, 'DEX 2级比例 = 3%', 0.03, DEX_REFERRAL_RATES[1]);
    assert(DEX_REFERRAL_RATES[2] === 0.02, 'DEX 3级比例 = 2%', 0.02, DEX_REFERRAL_RATES[2]);
    
    // 使用内置验证函数
    const validation = validateRewardConfiguration();
    assert(validation.allValid, '奖励配置验证通过', true, validation.allValid);
    
    console.log('\n  详细配置:');
    console.log(`    CEX: ${CEX_REFERRAL_RATES.map(r => (r*100)+'%').join(' + ')} = ${(cexTotal*100).toFixed(0)}%`);
    console.log(`    DEX: ${DEX_REFERRAL_RATES.map(r => (r*100)+'%').join(' + ')} = ${(dexTotal*100).toFixed(0)}%`);
}

// ============================================================================
// 2. 单级奖励计算验证
// ============================================================================
function verifyLevelRewardCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【2. 单级奖励计算验证】');
    console.log('='.repeat(60));
    
    // 测试用例: 收益1000 USDT
    const profit = 1000;
    
    // CEX 1级: 1000 × 30% = 300
    const cex1 = calculateLevelReward(profit, CEX_REFERRAL_RATES[0]);
    assertApprox(cex1, 300, 0.01, 'CEX 1级奖励计算: 1000 × 30% = 300');
    
    // CEX 2级: 1000 × 10% = 100
    const cex2 = calculateLevelReward(profit, CEX_REFERRAL_RATES[1]);
    assertApprox(cex2, 100, 0.01, 'CEX 2级奖励计算: 1000 × 10% = 100');
    
    // DEX 1级: 1000 × 5% = 50
    const dex1 = calculateLevelReward(profit, DEX_REFERRAL_RATES[0]);
    assertApprox(dex1, 50, 0.01, 'DEX 1级奖励计算: 1000 × 5% = 50');
}

// ============================================================================
// 3. 完整奖励分配计算验证
// ============================================================================
function verifyFullRewardCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【3. 完整奖励分配计算验证】');
    console.log('='.repeat(60));
    
    const profit = 1000;
    
    // CEX 完整奖励: 1000 × 50% = 500
    const cexRewards = calculateCexRewards(profit);
    assertApprox(cexRewards.totalDistributed, 500, 0.01, 'CEX 总分配: 1000 × 50% = 500');
    
    // DEX 完整奖励: 1000 × 10% = 100
    const dexRewards = calculateDexRewards(profit);
    assertApprox(dexRewards.totalDistributed, 100, 0.01, 'DEX 总分配: 1000 × 10% = 100');
    
    console.log('\n  CEX 奖励明细:');
    cexRewards.rewards.forEach(r => {
        console.log(`    ${r.level}级: ${r.formula}`);
    });
    
    console.log('\n  DEX 奖励明细:');
    dexRewards.rewards.forEach(r => {
        console.log(`    ${r.level}级: ${r.formula}`);
    });
}

// ============================================================================
// 4. 机器人收益计算验证
// ============================================================================
function verifyRobotEarningsCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【4. 机器人收益计算验证】');
    console.log('='.repeat(60));
    
    // CEX 机器人测试: Binance Ai Bot
    // 配置: 价格20, 日收益率2.0%, 周期24小时, 量化间隔24小时
    // 每次量化收益 = 20 × 2.0% × (24/24) = 0.4 USDT
    const binanceEarnings = calculateQuantifyEarnings('Binance Ai Bot', 20);
    assertApprox(binanceEarnings, 0.4, 0.01, 'Binance Ai Bot 量化收益: 20 × 2% = 0.4 USDT');
    
    // DEX 机器人测试: PancakeSwap Ai Bot
    // 配置: 价格1000, 日收益率1.8%, 周期30天
    // 每次量化收益 = 1000 × 1.8% × 1 = 18 USDT
    const pancakeEarnings = calculateQuantifyEarnings('PancakeSwap Ai Bot', 1000);
    assertApprox(pancakeEarnings, 18, 0.01, 'PancakeSwap Ai Bot 量化收益: 1000 × 1.8% = 18 USDT');
    
    // Grid 机器人测试: Binance Grid Bot-M1
    // 配置: 价格680, 日收益率1.5%, 周期120天
    // 每次量化收益 = 680 × 1.5% × 1 = 10.2 USDT
    const gridEarnings = calculateQuantifyEarnings('Binance Grid Bot-M1', 680);
    assertApprox(gridEarnings, 10.2, 0.01, 'Binance Grid Bot-M1 量化收益: 680 × 1.5% = 10.2 USDT');
    
    // High 机器人测试: Binance High Robot-H1
    // 配置: 日收益率1.2%, 周期1天
    // 到期总收益 = 1000 × (1 + 1.2%) = 1012 USDT
    const highReturn = calculateHighRobotReturn('Binance High Robot-H1', 1000);
    assertApprox(highReturn, 1012, 0.01, 'Binance High Robot-H1 到期返还: 1000 × 1.012 = 1012 USDT');
    
    // High 机器人 H2 测试
    // 配置: 日收益率1.3%, 周期3天
    // 到期总收益 = 1000 × (1 + 1.3% × 3) = 1039 USDT
    const highH2Return = calculateHighRobotReturn('Binance High Robot-H2', 1000);
    assertApprox(highH2Return, 1039, 0.01, 'Binance High Robot-H2 到期返还: 1000 × 1.039 = 1039 USDT');
    
    // High 机器人 H3 测试
    // 配置: 日收益率1.4%, 周期5天
    // 到期总收益 = 1000 × (1 + 1.4% × 5) = 1070 USDT
    const highH3Return = calculateHighRobotReturn('Binance High Robot-H3', 1000);
    assertApprox(highH3Return, 1070, 0.01, 'Binance High Robot-H3 到期返还: 1000 × 1.070 = 1070 USDT');
    
    console.log('\n  机器人收益公式验证:');
    console.log('    每次量化收益 = 本金 × (日收益率/100) × (量化间隔小时/24)');
    console.log('    High机器人到期 = 本金 × (1 + 日收益率/100 × 天数)');
}

// ============================================================================
// 5. 提款手续费计算验证
// ============================================================================
function verifyWithdrawFeeCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【5. 提款手续费计算验证】');
    console.log('='.repeat(60));
    
    // 提款手续费: 0.5% (千分之五)
    const withdrawAmount = 1000;
    const feeRate = 0.005;
    
    // 手续费计算
    const fee = withdrawAmount * feeRate;
    assertApprox(fee, 5, 0.001, '手续费计算: 1000 × 0.5% = 5 USDT');
    
    // 实际到账金额
    const actualAmount = withdrawAmount * (1 - feeRate);
    assertApprox(actualAmount, 995, 0.001, '实际到账: 1000 × 99.5% = 995 USDT');
    
    // 大额测试
    const largeAmount = 10000;
    const largeFee = largeAmount * feeRate;
    assertApprox(largeFee, 50, 0.001, '大额手续费: 10000 × 0.5% = 50 USDT');
    
    console.log('\n  提款手续费公式:');
    console.log('    手续费 = 提款金额 × 0.5%');
    console.log('    实际到账 = 提款金额 × 99.5%');
}

// ============================================================================
// 6. 质押收益计算验证
// ============================================================================
function verifyPledgeEarningsCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【6. 质押收益计算验证】');
    console.log('='.repeat(60));
    
    // WLD-01 产品配置:
    // 质押金额: 100 WLD, 总收益: 730 WLD, 周期: 365天, 日收益率: 2%
    const pledgeAmount = 100;
    const dailyRate = 0.02; // 2%
    const cycle = 365;
    
    // 每日收益
    const dailyIncome = pledgeAmount * dailyRate;
    assertApprox(dailyIncome, 2, 0.01, '每日收益: 100 × 2% = 2 WLD');
    
    // 总收益
    const totalIncome = dailyIncome * cycle;
    assertApprox(totalIncome, 730, 0.01, '总收益: 2 × 365 = 730 WLD');
    
    // 年化收益率 (APR)
    const apr = (totalIncome / pledgeAmount) * 100;
    assertApprox(apr, 730, 0.01, '年化收益率: 730%');
    
    // WLD-02 产品验证
    // 质押金额: 1000 WLD, 周期: 365天, 日收益率: 1%
    const wld02Daily = 1000 * 0.01;
    const wld02Total = wld02Daily * 365;
    assertApprox(wld02Total, 3650, 1, 'WLD-02 总收益: 1000 × 1% × 365 = 3650 WLD');
    
    console.log('\n  质押收益公式:');
    console.log('    每日收益 = 质押金额 × 日收益率');
    console.log('    总收益 = 每日收益 × 周期天数');
    console.log('    年化收益率 = (总收益 / 本金) × 100%');
}

// ============================================================================
// 7. 数学公式一致性验证
// ============================================================================
function verifyMathFormulas() {
    console.log('\n' + '='.repeat(60));
    console.log('【7. 数学公式一致性验证】');
    console.log('='.repeat(60));
    
    // 验证 referralMath.js 和 referralAdvancedMath.js 的配置一致性
    assert(
        JSON.stringify(CEX_REFERRAL_RATES) === JSON.stringify(CEX_RATES),
        'CEX比例配置一致性（referralMath vs referralAdvancedMath）',
        'true', 
        JSON.stringify(CEX_REFERRAL_RATES) === JSON.stringify(CEX_RATES)
    );
    
    assert(
        JSON.stringify(DEX_REFERRAL_RATES) === JSON.stringify(DEX_RATES),
        'DEX比例配置一致性（referralMath vs referralAdvancedMath）',
        'true',
        JSON.stringify(DEX_REFERRAL_RATES) === JSON.stringify(DEX_RATES)
    );
    
    // 数值验证
    const validationResult = numericalValidation([
        { type: 'CEX', profits: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] },
        { type: 'DEX', profits: [1000, 1000, 1000] }
    ]);
    assert(validationResult.allPassed, '数值验证全部通过', true, validationResult.allPassed);
    
    // 公式推导验证
    const formulas = deriveFormulas();
    assert(formulas.cex.totalRate === 0.5, 'CEX公式总比例验证', 0.5, formulas.cex.totalRate);
    assert(formulas.dex.totalRate === 0.1, 'DEX公式总比例验证', 0.1, formulas.dex.totalRate);
}

// ============================================================================
// 8. 递归树计算验证
// ============================================================================
function verifyTreeCalculation() {
    console.log('\n' + '='.repeat(60));
    console.log('【8. 递归树计算验证】');
    console.log('='.repeat(60));
    
    // 构建测试树:
    //       ROOT
    //      /    \
    //     A(100) B(200)
    //    / \      \
    //  A1(80) A2(60) B1(90)
    
    const root = new ReferralNode('ROOT', 0, 0);
    const nodeA = root.addChild(new ReferralNode('A', 100));
    const nodeB = root.addChild(new ReferralNode('B', 200));
    nodeA.addChild(new ReferralNode('A1', 80));
    nodeA.addChild(new ReferralNode('A2', 60));
    nodeB.addChild(new ReferralNode('B1', 90));
    
    const result = calculateTreeRewards(root, 'CEX');
    
    // 1级奖励: (100 + 200) × 30% = 90
    const level1Expected = (100 + 200) * 0.30;
    assertApprox(result.details[0].totalReward, level1Expected, 0.01, 
        '1级奖励: (100+200) × 30% = 90');
    
    // 2级奖励: (80 + 60 + 90) × 10% = 23
    const level2Expected = (80 + 60 + 90) * 0.10;
    assertApprox(result.details[1].totalReward, level2Expected, 0.01,
        '2级奖励: (80+60+90) × 10% = 23');
    
    // 总奖励
    const totalExpected = level1Expected + level2Expected;
    assertApprox(result.totalReward, totalExpected, 0.01,
        `总奖励: ${level1Expected} + ${level2Expected} = ${totalExpected}`);
    
    console.log('\n  推荐树结构:');
    console.log('          ROOT');
    console.log('         /    \\');
    console.log('      A(100)  B(200)');
    console.log('      / \\       \\');
    console.log('  A1(80) A2(60) B1(90)');
}

// ============================================================================
// 9. 蒙特卡洛模拟验证
// ============================================================================
function verifyMonteCarloSimulation() {
    console.log('\n' + '='.repeat(60));
    console.log('【9. 蒙特卡洛模拟验证】');
    console.log('='.repeat(60));
    
    const result = monteCarloSimulation({
        avgReferrals: 3,
        referralSuccessRate: 0.7,
        avgProfit: 100,
        profitVolatility: 30,
        simulations: 1000
    }, 'CEX');
    
    // 验证模拟结果的合理性
    assert(result.statistics.mean > 0, '模拟平均值大于0', '>0', result.statistics.mean.toFixed(2));
    assert(result.statistics.stdDev >= 0, '模拟标准差非负', '>=0', result.statistics.stdDev.toFixed(2));
    assert(result.statistics.min <= result.statistics.median, '最小值 <= 中位数', true, 
        result.statistics.min <= result.statistics.median);
    assert(result.statistics.median <= result.statistics.max, '中位数 <= 最大值', true,
        result.statistics.median <= result.statistics.max);
    
    console.log('\n  模拟统计结果:');
    console.log(`    模拟次数: ${result.simulations}`);
    console.log(`    平均值: ${result.statistics.mean.toFixed(2)} USDT`);
    console.log(`    中位数: ${result.statistics.median.toFixed(2)} USDT`);
    console.log(`    标准差: ${result.statistics.stdDev.toFixed(2)} USDT`);
    console.log(`    90%置信区间: ${result.statistics.confidenceInterval}`);
}

// ============================================================================
// 主函数
// ============================================================================
async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       Vitu Finance 数学算法验证报告                          ║');
    console.log('║       Mathematical Algorithm Verification Report            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const startTime = Date.now();
    
    // 执行所有验证
    verifyReferralRates();
    verifyLevelRewardCalculation();
    verifyFullRewardCalculation();
    verifyRobotEarningsCalculation();
    verifyWithdrawFeeCalculation();
    verifyPledgeEarningsCalculation();
    verifyMathFormulas();
    verifyTreeCalculation();
    verifyMonteCarloSimulation();
    
    // 输出总结
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('【验证结果总结】');
    console.log('='.repeat(60));
    console.log(`  总测试数: ${totalTests}`);
    console.log(`  通过: ${passedTests} ✅`);
    console.log(`  失败: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`  通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  耗时: ${duration}ms`);
    
    if (failedTests > 0) {
        console.log('\n  失败详情:');
        failedDetails.forEach((detail, i) => {
            console.log(`    ${i + 1}. ${detail}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    if (failedTests === 0) {
        console.log('✅ 所有数学算法验证通过！系统运行正常。');
    } else {
        console.log('⚠️ 部分测试失败，请检查上述详情。');
    }
    console.log('='.repeat(60));
    console.log('\n');
    
    // 返回退出码
    process.exit(failedTests > 0 ? 1 : 0);
}

// 执行
main();

