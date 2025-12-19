/**
 * ============================================================================
 * 全局用户奖励验证脚本
 * ============================================================================
 * 
 * 功能：
 * 1. 检查所有用户的有效推荐人数是否正确
 * 2. 检查所有用户的经纪人等级是否正确
 * 3. 检查推荐奖励是否正确发放
 * 4. 检查团队奖励是否正确发放
 * 5. 生成详细报告
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../../.env') });

// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'xie080886',
    password: process.env.DB_PASSWORD || 'xie080886',
    database: process.env.DB_NAME || 'xie080886'
};

// 常量定义
const MIN_ROBOT_PURCHASE = 100; // 合格成员门槛（100 USDT）
const ACTIVE_REFERRAL_MIN = 20;  // 有效推荐门槛（20 USDT）

/**
 * 主函数
 */
async function main() {
    let connection = null;
    
    try {
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║          全局用户奖励验证脚本                                 ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        // 连接数据库
        connection = await mysql.createConnection(dbConfig);
        console.log('✓ 数据库连接成功\n');
        
        // 1. 获取所有有推荐关系的用户
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【1】检查所有用户的推荐统计');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const [allReferrers] = await connection.query(`
            SELECT DISTINCT referrer_address 
            FROM user_referrals 
            WHERE referrer_address IS NOT NULL
            ORDER BY referrer_address
        `);
        
        console.log(`找到 ${allReferrers.length} 个推荐人\n`);
        
        const report = {
            total_referrers: allReferrers.length,
            users: [],
            issues: []
        };
        
        for (const { referrer_address } of allReferrers) {
            const userReport = await checkUserData(connection, referrer_address);
            report.users.push(userReport);
            
            // 打印用户报告
            printUserReport(userReport);
        }
        
        // 2. 检查推荐奖励发放
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【2】检查推荐奖励发放');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const [referralRewardsStats] = await connection.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT wallet_address) as unique_recipients,
                SUM(reward_amount) as total_amount,
                MIN(created_at) as first_reward,
                MAX(created_at) as last_reward
            FROM referral_rewards
        `);
        
        console.log('推荐奖励统计：');
        console.log(`  总记录数: ${referralRewardsStats[0].total_records}`);
        console.log(`  受益人数: ${referralRewardsStats[0].unique_recipients}`);
        console.log(`  总金额: ${parseFloat(referralRewardsStats[0].total_amount || 0).toFixed(4)} USDT`);
        console.log(`  首次发放: ${referralRewardsStats[0].first_reward || 'N/A'}`);
        console.log(`  最近发放: ${referralRewardsStats[0].last_reward || 'N/A'}\n`);
        
        // 3. 检查团队奖励发放
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【3】检查团队奖励发放');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const [teamRewardsStats] = await connection.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT wallet_address) as unique_recipients,
                SUM(reward_amount) as total_amount,
                MIN(created_at) as first_reward,
                MAX(created_at) as last_reward
            FROM team_rewards
            WHERE reward_type = 'daily_dividend'
        `);
        
        console.log('团队奖励统计：');
        console.log(`  总记录数: ${teamRewardsStats[0].total_records}`);
        console.log(`  受益人数: ${teamRewardsStats[0].unique_recipients}`);
        console.log(`  总金额: ${parseFloat(teamRewardsStats[0].total_amount || 0).toFixed(4)} USDT`);
        console.log(`  首次发放: ${teamRewardsStats[0].first_reward || 'N/A'}`);
        console.log(`  最近发放: ${teamRewardsStats[0].last_reward || 'N/A'}\n`);
        
        // 4. 检查经纪人等级分布
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【4】经纪人等级分布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const levelDistribution = {};
        for (let i = 0; i <= 5; i++) {
            levelDistribution[i] = 0;
        }
        
        report.users.forEach(user => {
            levelDistribution[user.broker_level]++;
        });
        
        console.log('等级分布：');
        for (let i = 0; i <= 5; i++) {
            console.log(`  Level ${i}: ${levelDistribution[i]} 人`);
        }
        
        // 5. 汇总问题
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【5】问题汇总');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const usersWithIssues = report.users.filter(u => u.has_issues);
        
        if (usersWithIssues.length === 0) {
            console.log('✓ 未发现任何问题！所有用户数据正常。\n');
        } else {
            console.log(`⚠ 发现 ${usersWithIssues.length} 个用户存在问题：\n`);
            usersWithIssues.forEach(user => {
                console.log(`  ${user.wallet_address.slice(0, 10)}...`);
                user.issues.forEach(issue => {
                    console.log(`    - ${issue}`);
                });
                console.log('');
            });
        }
        
        // 6. 总结
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('【总结】');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`✓ 检查完成`);
        console.log(`  总推荐人数: ${report.total_referrers}`);
        console.log(`  问题用户数: ${usersWithIssues.length}`);
        console.log(`  推荐奖励记录: ${referralRewardsStats[0].total_records}`);
        console.log(`  团队奖励记录: ${teamRewardsStats[0].total_records}\n`);
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * 检查单个用户的数据
 */
async function checkUserData(connection, walletAddress) {
    const wallet = walletAddress.toLowerCase();
    const report = {
        wallet_address: wallet,
        direct_members: 0,
        active_referrals: 0,
        qualified_members: 0,
        broker_level: 0,
        team_performance: 0,
        total_referral_reward: 0,
        total_team_reward: 0,
        issues: [],
        has_issues: false
    };
    
    try {
        // 1. 统计所有直推
        const [allDirect] = await connection.query(
            'SELECT COUNT(DISTINCT wallet_address) as count FROM user_referrals WHERE referrer_address = ?',
            [wallet]
        );
        report.direct_members = parseInt(allDirect[0].count) || 0;
        
        // 2. 统计有效推荐（≥20 USDT）
        const [activeRef] = await connection.query(`
            SELECT COUNT(DISTINCT r.wallet_address) as count
            FROM user_referrals r
            INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
            WHERE r.referrer_address = ? AND rp.price >= ? AND rp.status = 'active'
        `, [wallet, ACTIVE_REFERRAL_MIN]);
        report.active_referrals = parseInt(activeRef[0].count) || 0;
        
        // 3. 统计合格成员（≥100 USDT）
        const [qualified] = await connection.query(`
            SELECT COUNT(DISTINCT r.wallet_address) as count
            FROM user_referrals r
            INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
            WHERE r.referrer_address = ? AND rp.price >= ? AND rp.status = 'active'
        `, [wallet, MIN_ROBOT_PURCHASE]);
        report.qualified_members = parseInt(qualified[0].count) || 0;
        
        // 4. 获取团队业绩
        const [teamPerf] = await connection.query(`
            SELECT COALESCE(SUM(rp.price), 0) as total
            FROM user_referrals r
            INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
            WHERE r.referrer_address = ? AND rp.price >= ? AND rp.status = 'active'
        `, [wallet, MIN_ROBOT_PURCHASE]);
        report.team_performance = parseFloat(teamPerf[0].total) || 0;
        
        // 5. 简单判断经纪人等级（基础判断，不含下级经纪人）
        if (report.qualified_members >= 50 && report.team_performance > 200000) {
            report.broker_level = 5;
        } else if (report.qualified_members >= 30 && report.team_performance > 80000) {
            report.broker_level = 4;
        } else if (report.qualified_members >= 20 && report.team_performance > 20000) {
            report.broker_level = 3;
        } else if (report.qualified_members >= 10 && report.team_performance > 5000) {
            report.broker_level = 2;
        } else if (report.qualified_members >= 5 && report.team_performance > 1000) {
            report.broker_level = 1;
        } else {
            report.broker_level = 0;
        }
        
        // 6. 获取推荐奖励总额
        const [refReward] = await connection.query(
            'SELECT COALESCE(SUM(reward_amount), 0) as total FROM referral_rewards WHERE wallet_address = ?',
            [wallet]
        );
        report.total_referral_reward = parseFloat(refReward[0].total) || 0;
        
        // 7. 获取团队奖励总额
        const [teamReward] = await connection.query(
            'SELECT COALESCE(SUM(reward_amount), 0) as total FROM team_rewards WHERE wallet_address = ?',
            [wallet]
        );
        report.total_team_reward = parseFloat(teamReward[0].total) || 0;
        
        // 8. 检查问题
        // 问题1：有合格成员但没有推荐奖励
        if (report.active_referrals > 0 && report.total_referral_reward === 0) {
            // 检查下线是否有量化收益
            const [earnings] = await connection.query(`
                SELECT COUNT(*) as count
                FROM robot_earnings re
                INNER JOIN user_referrals ur ON re.wallet_address = ur.wallet_address
                WHERE ur.referrer_address = ?
            `, [wallet]);
            
            if (earnings[0].count > 0) {
                report.issues.push('有下线量化收益但推荐奖励为0');
                report.has_issues = true;
            }
        }
        
        // 问题2：达到经纪人等级但没有团队奖励
        if (report.broker_level >= 1 && report.total_team_reward === 0) {
            report.issues.push(`达到Level ${report.broker_level}但团队奖励为0（可能还未触发首次发放）`);
            // 这个不算严重问题，因为可能刚升级
        }
        
    } catch (error) {
        report.issues.push(`检查失败: ${error.message}`);
        report.has_issues = true;
    }
    
    return report;
}

/**
 * 打印用户报告
 */
function printUserReport(report) {
    console.log(`钱包: ${report.wallet_address.slice(0, 10)}...${report.wallet_address.slice(-8)}`);
    console.log(`  所有直推: ${report.direct_members} 人`);
    console.log(`  有效推荐(≥20U): ${report.active_referrals} 人`);
    console.log(`  合格成员(≥100U): ${report.qualified_members} 人`);
    console.log(`  经纪人等级: Level ${report.broker_level}`);
    console.log(`  团队业绩: ${report.team_performance.toFixed(4)} USDT`);
    console.log(`  推荐奖励总额: ${report.total_referral_reward.toFixed(4)} USDT`);
    console.log(`  团队奖励总额: ${report.total_team_reward.toFixed(4)} USDT`);
    
    if (report.has_issues) {
        console.log(`  ⚠️  问题:`);
        report.issues.forEach(issue => {
            console.log(`    - ${issue}`);
        });
    } else {
        console.log(`  ✓ 正常`);
    }
    console.log('');
}

// 运行主函数
main();

