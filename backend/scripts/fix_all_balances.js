/**
 * 修复所有用户的余额异常
 * 
 * 问题：早期购买机器人时没有正确扣除余额
 * 解决方案：重新计算所有用户的正确余额并更新
 * 
 * 使用方法：
 * node scripts/fix_all_balances.js
 */

import { query as dbQuery } from '../db.js';

// 是否真正执行更新（设为false时只显示需要修复的记录）
const DRY_RUN = process.argv.includes('--dry-run');

console.log('=====================================');
console.log('🔧 余额修复脚本');
console.log('=====================================');
console.log(`模式: ${DRY_RUN ? '只检查（不会真正更新）' : '修复模式（会更新数据库）'}`);
console.log('');

async function fixAllBalances() {
    try {
        // 1. 查询所有余额异常的用户
        const issues = await dbQuery(`
            SELECT 
                u.wallet_address,
                u.usdt_balance as current_balance,
                COALESCE(d.total_deposit, 0) as total_deposit,
                COALESCE(w.total_withdraw, 0) as total_withdraw,
                COALESCE(r.total_robot_cost, 0) as total_robot_cost,
                COALESCE(r.total_profit, 0) as total_profit,
                (
                    COALESCE(d.total_deposit, 0) 
                    - COALESCE(w.total_withdraw, 0) 
                    - COALESCE(r.total_robot_cost, 0) 
                    + COALESCE(r.total_profit, 0)
                ) as should_be_balance,
                (
                    u.usdt_balance - (
                        COALESCE(d.total_deposit, 0) 
                        - COALESCE(w.total_withdraw, 0) 
                        - COALESCE(r.total_robot_cost, 0) 
                        + COALESCE(r.total_profit, 0)
                    )
                ) as balance_difference
            FROM user_balances u
            LEFT JOIN (
                SELECT wallet_address, SUM(amount) as total_deposit
                FROM deposit_records 
                WHERE status = 'completed'
                GROUP BY wallet_address
            ) d ON u.wallet_address = d.wallet_address
            LEFT JOIN (
                SELECT wallet_address, SUM(amount) as total_withdraw
                FROM withdraw_records 
                WHERE status = 'completed'
                GROUP BY wallet_address
            ) w ON u.wallet_address = w.wallet_address
            LEFT JOIN (
                SELECT 
                    wallet_address, 
                    SUM(CASE WHEN status = 'active' THEN price ELSE 0 END) as total_robot_cost,
                    SUM(total_profit) as total_profit
                FROM robot_purchases
                GROUP BY wallet_address
            ) r ON u.wallet_address = r.wallet_address
            HAVING ABS(balance_difference) > 0.01
            ORDER BY ABS(balance_difference) DESC
        `);

        console.log(`📊 发现 ${issues.length} 个用户的余额需要修正\n`);

        let fixedCount = 0;
        let skippedCount = 0;

        for (const issue of issues) {
            const {
                wallet_address,
                current_balance,
                total_deposit,
                total_withdraw,
                total_robot_cost,
                total_profit,
                should_be_balance,
                balance_difference
            } = issue;

            console.log('───────────────────────────────────────');
            console.log(`👤 ${wallet_address.slice(0, 10)}...`);
            console.log(`   当前余额: ${parseFloat(current_balance).toFixed(4)} USDT`);
            console.log(`   总充值: ${parseFloat(total_deposit).toFixed(4)} USDT`);
            console.log(`   总提款: ${parseFloat(total_withdraw).toFixed(4)} USDT`);
            console.log(`   机器人成本: ${parseFloat(total_robot_cost).toFixed(4)} USDT`);
            console.log(`   获得收益: ${parseFloat(total_profit).toFixed(4)} USDT`);
            console.log(`   应该余额: ${parseFloat(should_be_balance).toFixed(4)} USDT`);
            console.log(`   差异: ${parseFloat(balance_difference).toFixed(4)} USDT`);

            // 检查余额是否会变成负数（不合理的情况）
            if (should_be_balance < -1) {
                console.log(`   ⚠️ 跳过：余额会变成负数（${parseFloat(should_be_balance).toFixed(4)} USDT）`);
                console.log(`   可能原因：充值记录不完整或机器人购买记录错误`);
                skippedCount++;
                continue;
            }

            if (!DRY_RUN) {
                // 更新余额
                await dbQuery(
                    'UPDATE user_balances SET usdt_balance = ?, updated_at = NOW() WHERE wallet_address = ?',
                    [should_be_balance, wallet_address]
                );

                console.log(`   ✅ 已修复：${parseFloat(current_balance).toFixed(4)} → ${parseFloat(should_be_balance).toFixed(4)} USDT`);
                fixedCount++;
            } else {
                console.log(`   🔍 待修复：${parseFloat(current_balance).toFixed(4)} → ${parseFloat(should_be_balance).toFixed(4)} USDT`);
                fixedCount++;
            }
        }

        console.log('───────────────────────────────────────');
        console.log('');
        console.log('=====================================');
        console.log('📈 执行结果');
        console.log('=====================================');
        console.log(`${DRY_RUN ? '待修复' : '已修复'}: ${fixedCount} 个用户`);
        console.log(`已跳过: ${skippedCount} 个用户（余额异常）`);
        console.log('');

        if (DRY_RUN) {
            console.log('⚠️ 这是只检查模式，没有真正更新数据库');
            console.log('💡 运行 "node scripts/fix_all_balances.js" 执行真正的修复');
        } else {
            console.log('✅ 余额修复完成！');
        }

        console.log('=====================================');

    } catch (error) {
        console.error('❌ 执行失败:', error);
        throw error;
    }
}

// 执行修复
fixAllBalances()
    .then(() => {
        console.log('\n🎉 脚本执行成功！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 脚本执行失败:', error);
        process.exit(1);
    });

