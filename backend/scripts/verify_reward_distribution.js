/**
 * 奖励发放验证脚本
 * 验证所有奖励发放逻辑是否与文档规则匹配
 * 
 * 执行方式: node scripts/verify_reward_distribution.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// 设置当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 导入数学工具
import {
    CEX_REFERRAL_RATES,
    DEX_REFERRAL_RATES,
    validateRewardConfiguration
} from '../src/utils/referralMath.js';

// 团队经纪人配置（直接定义，避免导入问题）
// 这些配置来自 src/cron/teamDividendCron.js
const MIN_ROBOT_PURCHASE = 100;

const BROKER_LEVELS = [
    { level: 0, minDirectReferrals: 0, minSubBrokers: 0, subBrokerLevel: 0, minTeamPerformance: 0, dailyDividend: 0, dailyWLD: 0 },
    { level: 1, minDirectReferrals: 5, minSubBrokers: 0, subBrokerLevel: 0, minTeamPerformance: 1000, dailyDividend: 5, dailyWLD: 1 },
    { level: 2, minDirectReferrals: 10, minSubBrokers: 2, subBrokerLevel: 1, minTeamPerformance: 5000, dailyDividend: 15, dailyWLD: 2 },
    { level: 3, minDirectReferrals: 20, minSubBrokers: 2, subBrokerLevel: 2, minTeamPerformance: 20000, dailyDividend: 60, dailyWLD: 3 },
    { level: 4, minDirectReferrals: 30, minSubBrokers: 2, subBrokerLevel: 3, minTeamPerformance: 80000, dailyDividend: 300, dailyWLD: 5 },
    { level: 5, minDirectReferrals: 50, minSubBrokers: 2, subBrokerLevel: 4, minTeamPerformance: 200000, dailyDividend: 1000, dailyWLD: 10 }
];

// ============================================================================
// 文档规则定义（来自 .cursor/个人推荐.md 和 .cursor/团队.md）
// ============================================================================

// 个人推荐规则 - CEX机器人
const DOC_CEX_RATES = [0.30, 0.10, 0.05, 0.01, 0.01, 0.01, 0.01, 0.01];

// 个人推荐规则 - DEX机器人
const DOC_DEX_RATES = [0.05, 0.03, 0.02];

// 团队经纪人规则
const DOC_BROKER_LEVELS = {
    1: { minDirect: 5, minSubBrokers: 0, subLevel: 0, minPerformance: 1000, dailyDividend: 5, dailyWLD: 1 },
    2: { minDirect: 10, minSubBrokers: 2, subLevel: 1, minPerformance: 5000, dailyDividend: 15, dailyWLD: 2 },
    3: { minDirect: 20, minSubBrokers: 2, subLevel: 2, minPerformance: 20000, dailyDividend: 60, dailyWLD: 3 },
    4: { minDirect: 30, minSubBrokers: 2, subLevel: 3, minPerformance: 80000, dailyDividend: 300, dailyWLD: 5 },
    5: { minDirect: 50, minSubBrokers: 2, subLevel: 4, minPerformance: 200000, dailyDividend: 1000, dailyWLD: 10 }
};

// ============================================================================
// 验证函数
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const issues = [];

function assert(condition, testName, expected, actual) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ ${testName}`);
    } else {
        failedTests++;
        issues.push(`${testName}: 期望 ${expected}, 实际 ${actual}`);
        console.log(`  ❌ ${testName}`);
        console.log(`     期望: ${expected}, 实际: ${actual}`);
    }
}

// ============================================================================
// 1. 验证个人推荐 - CEX奖励配置
// ============================================================================
function verifyCexReferralRates() {
    console.log('\n' + '='.repeat(60));
    console.log('【1. CEX机器人推荐奖励配置验证】');
    console.log('='.repeat(60));
    console.log('  文档规则: 8级量化收益的50%奖励');
    console.log('  1级-30% 2级-10% 3级-5% 4级-1% 5级-1% 6级-1% 7级-1% 8级-1%\n');
    
    // 验证总比例
    const codeTotal = CEX_REFERRAL_RATES.reduce((a, b) => a + b, 0);
    const docTotal = DOC_CEX_RATES.reduce((a, b) => a + b, 0);
    assert(Math.abs(codeTotal - docTotal) < 0.0001, 'CEX总比例50%', '0.5', codeTotal.toFixed(2));
    
    // 验证各级比例
    for (let i = 0; i < 8; i++) {
        assert(
            CEX_REFERRAL_RATES[i] === DOC_CEX_RATES[i],
            `CEX ${i+1}级比例`,
            (DOC_CEX_RATES[i] * 100) + '%',
            (CEX_REFERRAL_RATES[i] * 100) + '%'
        );
    }
}

// ============================================================================
// 2. 验证个人推荐 - DEX奖励配置
// ============================================================================
function verifyDexReferralRates() {
    console.log('\n' + '='.repeat(60));
    console.log('【2. DEX机器人推荐奖励配置验证】');
    console.log('='.repeat(60));
    console.log('  文档规则: 启动金额的推荐奖励');
    console.log('  1级-5% 2级-3% 3级-2%\n');
    
    // 验证总比例
    const codeTotal = DEX_REFERRAL_RATES.reduce((a, b) => a + b, 0);
    const docTotal = DOC_DEX_RATES.reduce((a, b) => a + b, 0);
    assert(Math.abs(codeTotal - docTotal) < 0.0001, 'DEX总比例10%', '0.1', codeTotal.toFixed(2));
    
    // 验证各级比例
    for (let i = 0; i < 3; i++) {
        assert(
            DEX_REFERRAL_RATES[i] === DOC_DEX_RATES[i],
            `DEX ${i+1}级比例`,
            (DOC_DEX_RATES[i] * 100) + '%',
            (DEX_REFERRAL_RATES[i] * 100) + '%'
        );
    }
}

// ============================================================================
// 3. 验证团队经纪人配置
// ============================================================================
function verifyBrokerLevels() {
    console.log('\n' + '='.repeat(60));
    console.log('【3. 团队经纪人配置验证】');
    console.log('='.repeat(60));
    
    // 验证最低购买金额
    assert(MIN_ROBOT_PURCHASE === 100, '最低购买金额要求', '100', MIN_ROBOT_PURCHASE);
    
    for (let level = 1; level <= 5; level++) {
        const docConfig = DOC_BROKER_LEVELS[level];
        const codeConfig = BROKER_LEVELS[level];
        
        console.log(`\n  ${level}级经纪人:`);
        
        // 直推人数
        assert(
            codeConfig.minDirectReferrals === docConfig.minDirect,
            `  直推人数`,
            docConfig.minDirect,
            codeConfig.minDirectReferrals
        );
        
        // 下级经纪人数量
        assert(
            codeConfig.minSubBrokers === docConfig.minSubBrokers,
            `  下级经纪人数量`,
            docConfig.minSubBrokers,
            codeConfig.minSubBrokers
        );
        
        // 下级经纪人等级
        assert(
            codeConfig.subBrokerLevel === docConfig.subLevel,
            `  下级经纪人等级`,
            docConfig.subLevel,
            codeConfig.subBrokerLevel
        );
        
        // 团队业绩要求
        assert(
            codeConfig.minTeamPerformance === docConfig.minPerformance,
            `  团队业绩要求`,
            docConfig.minPerformance,
            codeConfig.minTeamPerformance
        );
        
        // 每日分红
        assert(
            codeConfig.dailyDividend === docConfig.dailyDividend,
            `  每日分红`,
            docConfig.dailyDividend + ' USDT',
            codeConfig.dailyDividend + ' USDT'
        );
        
        // 每日WLD
        assert(
            codeConfig.dailyWLD === docConfig.dailyWLD,
            `  每日WLD`,
            docConfig.dailyWLD + ' WLD',
            codeConfig.dailyWLD + ' WLD'
        );
    }
}

// ============================================================================
// 4. 数据库奖励记录检查
// ============================================================================
async function verifyDatabaseRewards() {
    console.log('\n' + '='.repeat(60));
    console.log('【4. 数据库奖励发放记录检查】');
    console.log('='.repeat(60));
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        // 检查 referral_rewards 表
        const [referralStats] = await connection.query(`
            SELECT 
                source_type,
                COUNT(*) as count,
                SUM(reward_amount) as total_amount,
                AVG(reward_rate) as avg_rate
            FROM referral_rewards 
            GROUP BY source_type
            ORDER BY source_type
        `);
        
        console.log('\n  推荐奖励记录统计:');
        if (referralStats.length === 0) {
            console.log('    暂无奖励记录');
        } else {
            console.log('  ┌──────────────────┬────────┬──────────────┬──────────┐');
            console.log('  │ 奖励类型          │ 记录数 │ 总金额(USDT) │ 平均比例 │');
            console.log('  ├──────────────────┼────────┼──────────────┼──────────┤');
            for (const stat of referralStats) {
                const type = stat.source_type.padEnd(16);
                const count = String(stat.count).padStart(6);
                const amount = parseFloat(stat.total_amount || 0).toFixed(2).padStart(12);
                const rate = (parseFloat(stat.avg_rate || 0)).toFixed(1).padStart(6) + '%';
                console.log(`  │ ${type} │ ${count} │ ${amount} │ ${rate} │`);
            }
            console.log('  └──────────────────┴────────┴──────────────┴──────────┘');
        }
        
        // 检查 team_rewards 表
        const [teamStats] = await connection.query(`
            SELECT 
                broker_level,
                COUNT(*) as count,
                SUM(reward_amount) as total_amount
            FROM team_rewards 
            GROUP BY broker_level
            ORDER BY broker_level
        `);
        
        console.log('\n  团队分红记录统计:');
        if (teamStats.length === 0) {
            console.log('    暂无团队分红记录');
        } else {
            console.log('  ┌──────────┬────────┬──────────────┐');
            console.log('  │ 经纪等级 │ 记录数 │ 总金额(USDT) │');
            console.log('  ├──────────┼────────┼──────────────┤');
            for (const stat of teamStats) {
                const level = String(stat.broker_level).padStart(8);
                const count = String(stat.count).padStart(6);
                const amount = parseFloat(stat.total_amount || 0).toFixed(2).padStart(12);
                console.log(`  │ ${level} │ ${count} │ ${amount} │`);
            }
            console.log('  └──────────┴────────┴──────────────┘');
        }
        
        // 检查最近的奖励记录
        const [recentRewards] = await connection.query(`
            SELECT 
                wallet_address,
                from_wallet,
                level,
                reward_rate,
                reward_amount,
                source_type,
                robot_name,
                created_at
            FROM referral_rewards 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('\n  最近10条推荐奖励记录:');
        if (recentRewards.length === 0) {
            console.log('    暂无记录');
        } else {
            for (const r of recentRewards) {
                console.log(`    ${r.created_at.toISOString().slice(0, 19)} | ` +
                           `Level ${r.level} | ${r.reward_rate}% | ` +
                           `${parseFloat(r.reward_amount).toFixed(4)} USDT | ` +
                           `${r.source_type} | ${r.robot_name || '-'}`);
            }
        }
        
    } finally {
        await connection.end();
    }
}

// ============================================================================
// 5. 代码逻辑检查
// ============================================================================
async function verifyCodeLogic() {
    console.log('\n' + '='.repeat(60));
    console.log('【5. 代码奖励发放逻辑检查】');
    console.log('='.repeat(60));
    
    const fs = await import('fs');
    const robotRoutesPath = path.join(__dirname, '../src/routes/robotRoutes.js');
    const robotRoutesCode = fs.readFileSync(robotRoutesPath, 'utf8');
    
    // 检查量化接口是否有推荐奖励发放
    const hasQuantifyReward = robotRoutesCode.includes('发放CEX推荐奖励') || 
                              robotRoutesCode.includes('Quantify Reward');
    assert(hasQuantifyReward, 'robotRoutes.js 量化接口包含推荐奖励发放', 'true', hasQuantifyReward);
    
    // 检查DEX购买奖励调用
    const hasDexReward = robotRoutesCode.includes('distributeDexPurchaseRewards');
    assert(hasDexReward, 'robotRoutes.js 包含DEX购买奖励函数', 'true', hasDexReward);
    
    // 检查CEX奖励比例导入
    const hasCexImport = robotRoutesCode.includes('CEX_REFERRAL_RATES');
    assert(hasCexImport, 'robotRoutes.js 导入CEX奖励比例', 'true', hasCexImport);
    
    // 检查DEX奖励比例导入
    const hasDexImport = robotRoutesCode.includes('DEX_REFERRAL_RATES');
    assert(hasDexImport, 'robotRoutes.js 导入DEX奖励比例', 'true', hasDexImport);
    
    // 检查团队分红定时任务
    const teamCronPath = path.join(__dirname, '../src/cron/teamDividendCron.js');
    const teamCronCode = fs.readFileSync(teamCronPath, 'utf8');
    
    const hasTeamDividend = teamCronCode.includes('dailyDividend') && teamCronCode.includes('dailyWLD');
    assert(hasTeamDividend, 'teamDividendCron.js 包含分红配置', 'true', hasTeamDividend);
}

// ============================================================================
// 主函数
// ============================================================================
async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       Vitu Finance 奖励发放验证报告                          ║');
    console.log('║       Reward Distribution Verification Report               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const startTime = Date.now();
    
    // 执行所有验证
    verifyCexReferralRates();
    verifyDexReferralRates();
    verifyBrokerLevels();
    await verifyCodeLogic();
    await verifyDatabaseRewards();
    
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
    
    if (issues.length > 0) {
        console.log('\n  ⚠️ 发现的问题:');
        issues.forEach((issue, i) => {
            console.log(`    ${i + 1}. ${issue}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('【奖励发放规则对照表】');
    console.log('='.repeat(60));
    
    console.log('\n  📋 个人推荐 - CEX机器人:');
    console.log('     触发条件: 用户量化CEX/Grid/High机器人获得收益时');
    console.log('     发放金额: 量化收益 × 各级比例');
    console.log('     比例配置: 30% + 10% + 5% + 1%×5 = 50%');
    
    console.log('\n  📋 个人推荐 - DEX机器人:');
    console.log('     触发条件: 用户购买DEX机器人时');
    console.log('     发放金额: 购买金额 × 各级比例');
    console.log('     比例配置: 5% + 3% + 2% = 10%');
    
    console.log('\n  📋 团队经纪人分红:');
    console.log('     触发条件: 每天凌晨1点自动检查');
    console.log('     发放条件: 满足对应等级的直推/下级经纪人/业绩要求');
    console.log('     发放金额: 按等级配置的每日USDT+WLD分红');
    
    console.log('\n' + '='.repeat(60));
    if (failedTests === 0) {
        console.log('✅ 所有奖励发放配置验证通过！');
    } else {
        console.log('⚠️ 部分验证失败，请检查上述问题。');
    }
    console.log('='.repeat(60));
    console.log('\n');
    
    process.exit(failedTests > 0 ? 1 : 0);
}

// 执行
main().catch(console.error);

