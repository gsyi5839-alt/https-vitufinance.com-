/**
 * 数据库迁移脚本
 * 执行方式: node scripts/run_migration.js
 * 
 * 功能：补齐所有数据库字段
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// 加载环境变量
dotenv.config();

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,  // 允许执行多条SQL语句
    timezone: '+08:00'
};

/**
 * 安全添加字段（如果不存在）
 */
async function addColumnIfNotExists(connection, tableName, columnName, columnDef) {
    try {
        // 检查字段是否存在
        const [rows] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
        `, [tableName, columnName]);
        
        if (rows[0].count === 0) {
            // 字段不存在，添加
            const sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`;
            await connection.execute(sql);
            console.log(`✅ 添加字段: ${tableName}.${columnName}`);
            return true;
        } else {
            console.log(`⏭️  字段已存在: ${tableName}.${columnName}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 添加字段失败 ${tableName}.${columnName}:`, error.message);
        return false;
    }
}

/**
 * 安全添加索引（如果不存在）
 */
async function addIndexIfNotExists(connection, tableName, indexName, columnName) {
    try {
        // 检查索引是否存在
        const [rows] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND INDEX_NAME = ?
        `, [tableName, indexName]);
        
        if (rows[0].count === 0) {
            // 索引不存在，添加
            const sql = `CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columnName})`;
            await connection.execute(sql);
            console.log(`✅ 添加索引: ${tableName}.${indexName}`);
            return true;
        } else {
            console.log(`⏭️  索引已存在: ${tableName}.${indexName}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 添加索引失败 ${tableName}.${indexName}:`, error.message);
        return false;
    }
}

/**
 * 执行SQL语句（忽略已存在错误）
 */
async function executeSafe(connection, sql, description) {
    try {
        await connection.execute(sql);
        console.log(`✅ ${description}`);
        return true;
    } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            console.log(`⏭️  ${description} - 已存在`);
            return true;
        }
        console.error(`❌ ${description}:`, error.message);
        return false;
    }
}

/**
 * 主迁移函数
 */
async function runMigration() {
    console.log('');
    console.log('='.repeat(60));
    console.log('🔄 开始执行数据库迁移...');
    console.log('='.repeat(60));
    console.log('');
    
    let connection;
    
    try {
        // 连接数据库
        console.log('📡 连接数据库...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ 数据库连接成功');
        console.log('');
        
        // ==================== 1. withdraw_records 表 ====================
        console.log('--- 1. withdraw_records 表 ---');
        await addColumnIfNotExists(connection, 'withdraw_records', 'fee', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "手续费金额" AFTER `amount`');
        await addColumnIfNotExists(connection, 'withdraw_records', 'actual_amount', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "实际到账金额" AFTER `fee`');
        await addColumnIfNotExists(connection, 'withdraw_records', 'network', 
            'VARCHAR(20) NOT NULL DEFAULT "BSC" COMMENT "提款网络" AFTER `token`');
        await addColumnIfNotExists(connection, 'withdraw_records', 'remark', 
            'VARCHAR(255) DEFAULT NULL COMMENT "备注" AFTER `completed_at`');
        await addColumnIfNotExists(connection, 'withdraw_records', 'processed_by', 
            'VARCHAR(50) DEFAULT NULL COMMENT "处理人" AFTER `remark`');
        await addColumnIfNotExists(connection, 'withdraw_records', 'processed_at', 
            'DATETIME DEFAULT NULL COMMENT "处理时间" AFTER `processed_by`');
        
        // 更新现有记录
        await executeSafe(connection, `
            UPDATE withdraw_records 
            SET 
                fee = CASE WHEN fee = 0 OR fee IS NULL THEN amount * 0.005 ELSE fee END,
                actual_amount = CASE WHEN actual_amount = 0 OR actual_amount IS NULL THEN amount * 0.995 ELSE actual_amount END
            WHERE fee = 0 OR fee IS NULL OR actual_amount = 0 OR actual_amount IS NULL
        `, '更新 withdraw_records 手续费数据');
        console.log('');
        
        // ==================== 2. robot_purchases 表 ====================
        console.log('--- 2. robot_purchases 表 ---');
        await addColumnIfNotExists(connection, 'robot_purchases', 'start_time', 
            'DATETIME DEFAULT NULL COMMENT "精确开始时间" AFTER `end_date`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'end_time', 
            'DATETIME DEFAULT NULL COMMENT "精确结束时间" AFTER `start_time`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'duration_hours', 
            'INT NOT NULL DEFAULT 24 COMMENT "运行周期（小时）" AFTER `end_time`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'last_quantify_at', 
            'DATETIME DEFAULT NULL COMMENT "最后量化时间" AFTER `expected_return`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'quantify_count', 
            'INT NOT NULL DEFAULT 0 COMMENT "量化次数" AFTER `last_quantify_at`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'cancelled_at', 
            'DATETIME DEFAULT NULL COMMENT "取消时间" AFTER `quantify_count`');
        await addColumnIfNotExists(connection, 'robot_purchases', 'expired_at', 
            'DATETIME DEFAULT NULL COMMENT "过期处理时间" AFTER `cancelled_at`');
        
        // 更新现有记录的时间字段
        await executeSafe(connection, `
            UPDATE robot_purchases 
            SET 
                start_time = CONCAT(DATE(start_date), ' 00:00:00'),
                end_time = CONCAT(DATE(end_date), ' 23:59:59'),
                duration_hours = GREATEST(DATEDIFF(end_date, start_date) * 24, 24)
            WHERE start_time IS NULL OR end_time IS NULL
        `, '更新 robot_purchases 时间数据');
        console.log('');
        
        // ==================== 3. system_settings 表 ====================
        console.log('--- 3. system_settings 表 ---');
        await executeSafe(connection, `
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                setting_key VARCHAR(100) NOT NULL COMMENT '设置键名',
                setting_value TEXT COMMENT '设置值',
                setting_type VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT '值类型',
                description VARCHAR(255) DEFAULT NULL COMMENT '设置描述',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                PRIMARY KEY (id),
                UNIQUE KEY uk_setting_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表'
        `, '创建 system_settings 表');
        
        // 插入默认设置
        const defaultSettings = [
            ['platform_wallet_address', '0x1234567890abcdef1234567890abcdef12345678', 'text', '平台收款钱包地址'],
            ['platform_network', 'BSC', 'text', '平台网络类型'],
            ['platform_token', 'USDT', 'text', '平台默认代币'],
            ['min_withdraw_amount', '10', 'number', '最小提款金额'],
            ['max_withdraw_amount', '100000', 'number', '最大提款金额'],
            ['withdraw_fee_rate', '0.005', 'number', '提款手续费率'],
            ['referral_reward_rate_level1', '0.30', 'number', '一级推荐奖励比例'],
            ['referral_reward_rate_level2', '0.10', 'number', '二级推荐奖励比例'],
            ['referral_reward_rate_level3', '0.05', 'number', '三级推荐奖励比例'],
            ['quantify_enabled', 'true', 'boolean', '量化功能是否启用'],
            ['maintenance_mode', 'false', 'boolean', '是否处于维护模式'],
            ['admin_avatar', '', 'text', '管理员头像路径']
        ];
        
        for (const setting of defaultSettings) {
            await executeSafe(connection, `
                INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) 
                VALUES ('${setting[0]}', '${setting[1]}', '${setting[2]}', '${setting[3]}')
            `, `插入默认设置: ${setting[0]}`);
        }
        console.log('');
        
        // ==================== 4. robot_quantify_logs 表 ====================
        console.log('--- 4. robot_quantify_logs 表 ---');
        await executeSafe(connection, `
            CREATE TABLE IF NOT EXISTS robot_quantify_logs (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                robot_purchase_id INT(11) UNSIGNED NOT NULL COMMENT '机器人购买记录ID',
                wallet_address VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
                robot_name VARCHAR(100) NOT NULL COMMENT '机器人名称',
                robot_type VARCHAR(20) DEFAULT NULL COMMENT '机器人类型',
                earnings DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '本次量化收益',
                cumulative_earnings DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
                status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '量化状态',
                remark VARCHAR(255) DEFAULT NULL COMMENT '备注信息',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                PRIMARY KEY (id),
                KEY idx_robot_purchase_id (robot_purchase_id),
                KEY idx_wallet_address (wallet_address),
                KEY idx_created_at (created_at),
                KEY idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人量化日志表'
        `, '创建 robot_quantify_logs 表');
        
        // 补充字段（如果表已存在但字段不全）
        await addColumnIfNotExists(connection, 'robot_quantify_logs', 'robot_type', 
            'VARCHAR(20) DEFAULT NULL COMMENT "机器人类型" AFTER `robot_name`');
        await addColumnIfNotExists(connection, 'robot_quantify_logs', 'cumulative_earnings', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "累计收益" AFTER `earnings`');
        await addColumnIfNotExists(connection, 'robot_quantify_logs', 'status', 
            'VARCHAR(20) NOT NULL DEFAULT "success" COMMENT "量化状态" AFTER `cumulative_earnings`');
        await addColumnIfNotExists(connection, 'robot_quantify_logs', 'remark', 
            'VARCHAR(255) DEFAULT NULL COMMENT "备注信息" AFTER `status`');
        console.log('');
        
        // ==================== 5. referral_rewards 表 ====================
        console.log('--- 5. referral_rewards 表 ---');
        await addColumnIfNotExists(connection, 'referral_rewards', 'reward_rate', 
            'DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT "奖励比例" AFTER `level`');
        await addColumnIfNotExists(connection, 'referral_rewards', 'source_amount', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "来源收益金额" AFTER `robot_name`');
        
        // 更新现有记录的奖励比例
        await executeSafe(connection, `
            UPDATE referral_rewards 
            SET reward_rate = CASE 
                WHEN level = 1 THEN 30.00
                WHEN level = 2 THEN 10.00
                WHEN level = 3 THEN 5.00
                WHEN level >= 4 AND level <= 8 THEN 1.00
                ELSE 0.00
            END
            WHERE reward_rate = 0 OR reward_rate IS NULL
        `, '更新 referral_rewards 奖励比例数据');
        console.log('');
        
        // ==================== 6. user_balances 表 ====================
        console.log('--- 6. user_balances 表 ---');
        await addColumnIfNotExists(connection, 'user_balances', 'frozen_usdt', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "冻结USDT余额" AFTER `wld_balance`');
        await addColumnIfNotExists(connection, 'user_balances', 'frozen_wld', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "冻结WLD余额" AFTER `frozen_usdt`');
        await addColumnIfNotExists(connection, 'user_balances', 'total_profit', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "累计量化收益" AFTER `total_withdraw`');
        await addColumnIfNotExists(connection, 'user_balances', 'total_referral_reward', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "累计推荐奖励" AFTER `total_profit`');
        console.log('');
        
        // ==================== 7. deposit_records 表 ====================
        console.log('--- 7. deposit_records 表 ---');
        await addColumnIfNotExists(connection, 'deposit_records', 'network', 
            'VARCHAR(20) NOT NULL DEFAULT "BSC" COMMENT "充值网络" AFTER `token`');
        await addColumnIfNotExists(connection, 'deposit_records', 'from_address', 
            'VARCHAR(42) DEFAULT NULL COMMENT "充值来源地址" AFTER `tx_hash`');
        await addColumnIfNotExists(connection, 'deposit_records', 'remark', 
            'VARCHAR(255) DEFAULT NULL COMMENT "备注" AFTER `completed_at`');
        console.log('');
        
        // ==================== 8. announcements 表 ====================
        console.log('--- 8. announcements 表 ---');
        await addColumnIfNotExists(connection, 'announcements', 'type', 
            'VARCHAR(20) NOT NULL DEFAULT "notice" COMMENT "公告类型" AFTER `id`');
        await addColumnIfNotExists(connection, 'announcements', 'icon', 
            'VARCHAR(50) DEFAULT NULL COMMENT "公告图标" AFTER `type`');
        await addColumnIfNotExists(connection, 'announcements', 'link', 
            'VARCHAR(255) DEFAULT NULL COMMENT "跳转链接" AFTER `content`');
        console.log('');
        
        // ==================== 9. user_referrals 表 ====================
        console.log('--- 9. user_referrals 表 ---');
        await addColumnIfNotExists(connection, 'user_referrals', 'level', 
            'INT(2) NOT NULL DEFAULT 1 COMMENT "推荐层级" AFTER `referrer_code`');
        await addColumnIfNotExists(connection, 'user_referrals', 'status', 
            'VARCHAR(20) NOT NULL DEFAULT "active" COMMENT "状态" AFTER `level`');
        console.log('');
        
        // ==================== 10. user_pledges 表 ====================
        console.log('--- 10. user_pledges 表 ---');
        await addColumnIfNotExists(connection, 'user_pledges', 'apr', 
            'DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT "年化收益率" AFTER `total_income`');
        await addColumnIfNotExists(connection, 'user_pledges', 'paid_reward', 
            'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "已发放收益" AFTER `earned_income`');
        console.log('');
        
        // ==================== 11. 添加索引 ====================
        console.log('--- 11. 添加索引 ---');
        await addIndexIfNotExists(connection, 'robot_purchases', 'idx_robot_type', '`robot_type`');
        await addIndexIfNotExists(connection, 'robot_purchases', 'idx_is_quantified', '`is_quantified`');
        await addIndexIfNotExists(connection, 'robot_purchases', 'idx_start_time', '`start_time`');
        await addIndexIfNotExists(connection, 'robot_purchases', 'idx_end_time', '`end_time`');
        await addIndexIfNotExists(connection, 'withdraw_records', 'idx_processed_at', '`processed_at`');
        await addIndexIfNotExists(connection, 'referral_rewards', 'idx_reward_rate', '`reward_rate`');
        await addIndexIfNotExists(connection, 'robot_quantify_logs', 'idx_robot_type', '`robot_type`');
        console.log('');
        
        // 完成
        console.log('='.repeat(60));
        console.log('✅ 数据库迁移完成！');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('❌ 迁移失败:', error.message);
        console.error('='.repeat(60));
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('');
            console.log('📤 数据库连接已关闭');
        }
    }
}

// 执行迁移
runMigration();

