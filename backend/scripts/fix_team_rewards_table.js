/**
 * 修复 team_rewards 表结构
 * 添加缺失的 reward_type 字段
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

async function fixTeamRewardsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('🔧 开始修复 team_rewards 表...\n');

    try {
        // 1. 检查表是否存在
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'team_rewards'`,
            [process.env.DB_NAME]
        );

        if (tables.length === 0) {
            console.log('📝 表不存在，创建新表...');
            await connection.query(`
                CREATE TABLE team_rewards (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    wallet_address VARCHAR(42) NOT NULL,
                    reward_type VARCHAR(50) NOT NULL DEFAULT 'daily_dividend',
                    broker_level INT NOT NULL DEFAULT 0,
                    reward_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
                    reward_date DATE NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_wallet (wallet_address),
                    INDEX idx_date (reward_date),
                    INDEX idx_type (reward_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('✅ team_rewards 表创建成功');
            return;
        }

        // 2. 检查 reward_type 字段是否存在
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'team_rewards' AND COLUMN_NAME = 'reward_type'`,
            [process.env.DB_NAME]
        );

        if (columns.length === 0) {
            console.log('📝 添加 reward_type 字段...');
            await connection.query(`
                ALTER TABLE team_rewards 
                ADD COLUMN reward_type VARCHAR(50) NOT NULL DEFAULT 'daily_dividend' AFTER wallet_address
            `);
            console.log('✅ reward_type 字段添加成功');

            // 添加索引
            try {
                await connection.query(`
                    ALTER TABLE team_rewards ADD INDEX idx_type (reward_type)
                `);
                console.log('✅ reward_type 索引添加成功');
            } catch (e) {
                if (!e.message.includes('Duplicate')) {
                    console.log('⚠️ 索引可能已存在:', e.message);
                }
            }
        } else {
            console.log('✅ reward_type 字段已存在');
        }

        // 3. 检查 broker_level 字段
        const [brokerCols] = await connection.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'team_rewards' AND COLUMN_NAME = 'broker_level'`,
            [process.env.DB_NAME]
        );

        if (brokerCols.length === 0) {
            console.log('📝 添加 broker_level 字段...');
            await connection.query(`
                ALTER TABLE team_rewards 
                ADD COLUMN broker_level INT NOT NULL DEFAULT 0 AFTER reward_type
            `);
            console.log('✅ broker_level 字段添加成功');
        } else {
            console.log('✅ broker_level 字段已存在');
        }

        // 4. 显示最终表结构
        const [structure] = await connection.query(`DESCRIBE team_rewards`);
        console.log('\n📋 team_rewards 表最终结构:');
        console.log('┌─────────────────┬──────────────┬──────┬─────┬─────────────────────┐');
        console.log('│ Field           │ Type         │ Null │ Key │ Default             │');
        console.log('├─────────────────┼──────────────┼──────┼─────┼─────────────────────┤');
        structure.forEach(col => {
            console.log(`│ ${col.Field.padEnd(15)} │ ${(col.Type || '').toString().padEnd(12)} │ ${(col.Null || '').padEnd(4)} │ ${(col.Key || '').padEnd(3)} │ ${String(col.Default || 'NULL').padEnd(19)} │`);
        });
        console.log('└─────────────────┴──────────────┴──────┴─────┴─────────────────────┘');

    } catch (error) {
        console.error('❌ 修复失败:', error.message);
        throw error;
    } finally {
        await connection.end();
    }

    console.log('\n✅ team_rewards 表修复完成！');
}

// 执行
fixTeamRewardsTable().catch(console.error);

