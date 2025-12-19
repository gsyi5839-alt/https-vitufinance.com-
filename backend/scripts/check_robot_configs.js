/**
 * 检查机器人配置完整性
 * 找出数据库中哪些机器人没有对应的配置
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

// 导入机器人配置
import { getRobotConfig, ALL_ROBOTS } from '../src/config/robotConfig.js';

async function checkRobotConfigs() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('\n' + '='.repeat(70));
    console.log('  机器人配置完整性检查');
    console.log('='.repeat(70) + '\n');

    try {
        // 1. 获取所有已配置的机器人名称
        const configuredRobots = Object.keys(ALL_ROBOTS);
        console.log(`📋 配置文件中的机器人数量: ${configuredRobots.length}`);
        console.log('');
        
        // 2. 获取数据库中所有不同的机器人名称
        const [dbRobots] = await connection.query(`
            SELECT DISTINCT robot_name, robot_type, COUNT(*) as count,
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                   SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_count
            FROM robot_purchases 
            GROUP BY robot_name, robot_type
            ORDER BY robot_name
        `);

        console.log(`📊 数据库中的机器人种类: ${dbRobots.length}\n`);

        // 3. 检查配置完整性
        const missingConfigs = [];
        const validConfigs = [];
        
        for (const robot of dbRobots) {
            const config = getRobotConfig(robot.robot_name);
            if (!config) {
                missingConfigs.push(robot);
            } else {
                validConfigs.push({
                    ...robot,
                    config
                });
            }
        }

        // 4. 输出有配置的机器人
        if (validConfigs.length > 0) {
            console.log('✅ 配置正确的机器人:');
            console.log('┌────────────────────────────────┬──────────┬────────┬─────────┬─────────────┐');
            console.log('│ 机器人名称                      │ 类型     │ 总数量 │ 活跃   │ 日收益率    │');
            console.log('├────────────────────────────────┼──────────┼────────┼─────────┼─────────────┤');
            for (const r of validConfigs) {
                console.log(`│ ${r.robot_name.padEnd(30)} │ ${r.robot_type.padEnd(8)} │ ${String(r.count).padStart(6)} │ ${String(r.active_count).padStart(7)} │ ${String(r.config.daily_profit + '%').padStart(11)} │`);
            }
            console.log('└────────────────────────────────┴──────────┴────────┴─────────┴─────────────┘');
        }

        // 5. 输出缺失配置的机器人
        if (missingConfigs.length > 0) {
            console.log('\n⚠️ 缺少配置的机器人 (这些机器人无法正常处理):');
            console.log('┌────────────────────────────────┬──────────┬────────┬─────────┐');
            console.log('│ 机器人名称                      │ 类型     │ 总数量 │ 活跃   │');
            console.log('├────────────────────────────────┼──────────┼────────┼─────────┤');
            for (const r of missingConfigs) {
                console.log(`│ ${r.robot_name.padEnd(30)} │ ${(r.robot_type || 'unknown').padEnd(8)} │ ${String(r.count).padStart(6)} │ ${String(r.active_count).padStart(7)} │`);
            }
            console.log('└────────────────────────────────┴──────────┴────────┴─────────┘');

            // 6. 详细显示缺失配置机器人的记录
            console.log('\n📋 缺失配置机器人的详细记录:');
            for (const r of missingConfigs) {
                const [details] = await connection.query(`
                    SELECT id, wallet_address, robot_name, robot_type, price, status, 
                           start_time, end_time, created_at
                    FROM robot_purchases 
                    WHERE robot_name = ?
                    ORDER BY id DESC
                    LIMIT 5
                `, [r.robot_name]);
                
                console.log(`\n  ${r.robot_name}:`);
                for (const d of details) {
                    console.log(`    - ID: ${d.id}, 钱包: ${d.wallet_address.slice(0, 10)}..., ` +
                               `价格: ${d.price}, 状态: ${d.status}, 创建: ${d.created_at}`);
                }
            }
        }

        // 7. 检查活跃但配置缺失的机器人
        const [activeWithoutConfig] = await connection.query(`
            SELECT id, wallet_address, robot_name, robot_type, price, status, 
                   start_time, end_time
            FROM robot_purchases 
            WHERE status = 'active' AND end_time <= NOW()
            ORDER BY end_time ASC
            LIMIT 20
        `);

        if (activeWithoutConfig.length > 0) {
            console.log('\n⚠️ 到期但未处理的机器人:');
            console.log('┌──────┬──────────────┬────────────────────────────────┬──────────┬─────────────────────┐');
            console.log('│ ID   │ 钱包地址     │ 机器人名称                      │ 状态     │ 结束时间            │');
            console.log('├──────┼──────────────┼────────────────────────────────┼──────────┼─────────────────────┤');
            for (const r of activeWithoutConfig) {
                const hasConfig = getRobotConfig(r.robot_name) ? '✓' : '✗';
                console.log(`│ ${String(r.id).padStart(4)} │ ${r.wallet_address.slice(0, 10)}.. │ ${r.robot_name.padEnd(30)} │ ${r.status.padEnd(8)} │ ${r.end_time} │ ${hasConfig}`);
            }
            console.log('└──────┴──────────────┴────────────────────────────────┴──────────┴─────────────────────┘');
        }

        // 8. 输出所有可用的配置名称供参考
        console.log('\n📚 所有可用的机器人配置名称:');
        console.log('  CEX: ' + Object.keys(ALL_ROBOTS).filter(k => ALL_ROBOTS[k].robot_type === 'cex').join(', '));
        console.log('  DEX: ' + Object.keys(ALL_ROBOTS).filter(k => ALL_ROBOTS[k].robot_type === 'dex').join(', '));
        console.log('  Grid: ' + Object.keys(ALL_ROBOTS).filter(k => ALL_ROBOTS[k].robot_type === 'grid').join(', '));
        console.log('  High: ' + Object.keys(ALL_ROBOTS).filter(k => ALL_ROBOTS[k].robot_type === 'high').join(', '));

        // 9. 总结
        console.log('\n' + '='.repeat(70));
        console.log('📊 统计总结:');
        console.log(`  - 配置正确的机器人类型: ${validConfigs.length}`);
        console.log(`  - 缺失配置的机器人类型: ${missingConfigs.length}`);
        if (missingConfigs.length > 0) {
            console.log('\n⚠️ 建议: 请在 src/config/robotConfig.js 中添加缺失的机器人配置');
            console.log('   或者将数据库中的无效记录状态更新为 cancelled');
        } else {
            console.log('\n✅ 所有机器人配置完整！');
        }
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// 执行
checkRobotConfigs().catch(console.error);

