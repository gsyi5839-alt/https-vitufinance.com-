-- ==================== 补齐所有数据库字段 ====================
-- 创建日期：2025年12月14日
-- 功能：补齐管理系统和用户端所需的所有数据库字段
-- 注意：执行前请备份数据库
-- 使用存储过程安全添加字段（字段已存在则跳过）

DELIMITER //

-- ==================== 辅助存储过程 - 安全添加字段 ====================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists//
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(100),
    IN columnName VARCHAR(100),
    IN columnDef TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ 添加字段: ', tableName, '.', columnName) AS result;
    ELSE
        SELECT CONCAT('⏭️ 字段已存在: ', tableName, '.', columnName) AS result;
    END IF;
END//

-- ==================== 辅助存储过程 - 安全添加索引 ====================
DROP PROCEDURE IF EXISTS AddIndexIfNotExists//
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(100),
    IN indexName VARCHAR(100),
    IN columnName VARCHAR(255)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX `', indexName, '` ON `', tableName, '` (', columnName, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ 添加索引: ', tableName, '.', indexName) AS result;
    ELSE
        SELECT CONCAT('⏭️ 索引已存在: ', tableName, '.', indexName) AS result;
    END IF;
END//

DELIMITER ;

-- ==================== 1. withdraw_records 表 - 添加手续费相关字段 ====================
CALL AddColumnIfNotExists('withdraw_records', 'fee', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "手续费金额" AFTER `amount`');
CALL AddColumnIfNotExists('withdraw_records', 'actual_amount', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "实际到账金额" AFTER `fee`');
CALL AddColumnIfNotExists('withdraw_records', 'network', 'VARCHAR(20) NOT NULL DEFAULT "BSC" COMMENT "提款网络" AFTER `token`');
CALL AddColumnIfNotExists('withdraw_records', 'remark', 'VARCHAR(255) DEFAULT NULL COMMENT "备注" AFTER `completed_at`');
CALL AddColumnIfNotExists('withdraw_records', 'processed_by', 'VARCHAR(50) DEFAULT NULL COMMENT "处理人" AFTER `remark`');
CALL AddColumnIfNotExists('withdraw_records', 'processed_at', 'DATETIME DEFAULT NULL COMMENT "处理时间" AFTER `processed_by`');

-- 更新现有记录的手续费和实际到账金额
UPDATE `withdraw_records` 
SET 
    `fee` = CASE WHEN `fee` = 0 THEN `amount` * 0.005 ELSE `fee` END,
    `actual_amount` = CASE WHEN `actual_amount` = 0 THEN `amount` * 0.995 ELSE `actual_amount` END
WHERE `fee` = 0 OR `actual_amount` = 0;


-- ==================== 2. robot_purchases 表 - 添加精确时间字段 ====================
CALL AddColumnIfNotExists('robot_purchases', 'start_time', 'DATETIME DEFAULT NULL COMMENT "精确开始时间" AFTER `end_date`');
CALL AddColumnIfNotExists('robot_purchases', 'end_time', 'DATETIME DEFAULT NULL COMMENT "精确结束时间" AFTER `start_time`');
CALL AddColumnIfNotExists('robot_purchases', 'duration_hours', 'INT NOT NULL DEFAULT 24 COMMENT "运行周期（小时）" AFTER `end_time`');
CALL AddColumnIfNotExists('robot_purchases', 'last_quantify_at', 'DATETIME DEFAULT NULL COMMENT "最后量化时间" AFTER `expected_return`');
CALL AddColumnIfNotExists('robot_purchases', 'quantify_count', 'INT NOT NULL DEFAULT 0 COMMENT "量化次数" AFTER `last_quantify_at`');
CALL AddColumnIfNotExists('robot_purchases', 'cancelled_at', 'DATETIME DEFAULT NULL COMMENT "取消时间" AFTER `quantify_count`');
CALL AddColumnIfNotExists('robot_purchases', 'expired_at', 'DATETIME DEFAULT NULL COMMENT "过期处理时间" AFTER `cancelled_at`');

-- 为现有记录设置默认的精确时间
UPDATE `robot_purchases` 
SET 
    `start_time` = CONCAT(DATE(`start_date`), ' 00:00:00'),
    `end_time` = CONCAT(DATE(`end_date`), ' 23:59:59'),
    `duration_hours` = GREATEST(DATEDIFF(`end_date`, `start_date`) * 24, 24)
WHERE `start_time` IS NULL OR `end_time` IS NULL;


-- ==================== 3. system_settings 表 - 系统配置表 ====================
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL COMMENT '设置键名',
    `setting_value` TEXT COMMENT '设置值',
    `setting_type` VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT '值类型：text/number/boolean/json',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '设置描述',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- 插入默认系统设置（忽略已存在的记录）
INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`) VALUES
('platform_wallet_address', '0x1234567890abcdef1234567890abcdef12345678', 'text', '平台收款钱包地址'),
('platform_network', 'BSC', 'text', '平台网络类型'),
('platform_token', 'USDT', 'text', '平台默认代币'),
('min_withdraw_amount', '10', 'number', '最小提款金额'),
('max_withdraw_amount', '100000', 'number', '最大提款金额'),
('withdraw_fee_rate', '0.005', 'number', '提款手续费率（0.5%）'),
('referral_reward_rate_level1', '0.30', 'number', '一级推荐奖励比例（30%）'),
('referral_reward_rate_level2', '0.10', 'number', '二级推荐奖励比例（10%）'),
('referral_reward_rate_level3', '0.05', 'number', '三级推荐奖励比例（5%）'),
('quantify_enabled', 'true', 'boolean', '量化功能是否启用'),
('maintenance_mode', 'false', 'boolean', '是否处于维护模式'),
('admin_avatar', '', 'text', '管理员头像路径');


-- ==================== 4. robot_quantify_logs 表 - 机器人量化日志 ====================
CREATE TABLE IF NOT EXISTS `robot_quantify_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `robot_purchase_id` INT(11) UNSIGNED NOT NULL COMMENT '机器人购买记录ID',
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `robot_name` VARCHAR(100) NOT NULL COMMENT '机器人名称',
    `robot_type` VARCHAR(20) DEFAULT NULL COMMENT '机器人类型',
    `earnings` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '本次量化收益',
    `cumulative_earnings` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
    `status` VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '量化状态：success/failed/pending',
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_robot_purchase_id` (`robot_purchase_id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人量化日志表';


-- ==================== 5. referral_rewards 表 - 补充字段 ====================
CALL AddColumnIfNotExists('referral_rewards', 'reward_rate', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT "奖励比例（百分比）" AFTER `level`');
CALL AddColumnIfNotExists('referral_rewards', 'source_amount', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "来源收益金额" AFTER `robot_name`');

-- 更新现有记录的奖励比例
UPDATE `referral_rewards` 
SET `reward_rate` = CASE 
    WHEN `level` = 1 THEN 30.00
    WHEN `level` = 2 THEN 10.00
    WHEN `level` = 3 THEN 5.00
    WHEN `level` >= 4 AND `level` <= 8 THEN 1.00
    ELSE 0.00
END
WHERE `reward_rate` = 0 OR `reward_rate` IS NULL;


-- ==================== 6. user_balances 表 - 补充字段 ====================
CALL AddColumnIfNotExists('user_balances', 'frozen_usdt', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "冻结USDT余额" AFTER `wld_balance`');
CALL AddColumnIfNotExists('user_balances', 'frozen_wld', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "冻结WLD余额" AFTER `frozen_usdt`');
CALL AddColumnIfNotExists('user_balances', 'total_profit', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "累计量化收益" AFTER `total_withdraw`');
CALL AddColumnIfNotExists('user_balances', 'total_referral_reward', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "累计推荐奖励" AFTER `total_profit`');


-- ==================== 7. deposit_records 表 - 补充字段 ====================
CALL AddColumnIfNotExists('deposit_records', 'network', 'VARCHAR(20) NOT NULL DEFAULT "BSC" COMMENT "充值网络" AFTER `token`');
CALL AddColumnIfNotExists('deposit_records', 'from_address', 'VARCHAR(42) DEFAULT NULL COMMENT "充值来源地址" AFTER `tx_hash`');
CALL AddColumnIfNotExists('deposit_records', 'remark', 'VARCHAR(255) DEFAULT NULL COMMENT "备注" AFTER `completed_at`');


-- ==================== 8. announcements 表 - 补充字段 ====================
CALL AddColumnIfNotExists('announcements', 'type', 'VARCHAR(20) NOT NULL DEFAULT "notice" COMMENT "公告类型：notice/warning/important" AFTER `id`');
CALL AddColumnIfNotExists('announcements', 'icon', 'VARCHAR(50) DEFAULT NULL COMMENT "公告图标" AFTER `type`');
CALL AddColumnIfNotExists('announcements', 'link', 'VARCHAR(255) DEFAULT NULL COMMENT "跳转链接" AFTER `content`');


-- ==================== 9. user_referrals 表 - 补充字段 ====================
CALL AddColumnIfNotExists('user_referrals', 'level', 'INT(2) NOT NULL DEFAULT 1 COMMENT "推荐层级" AFTER `referrer_code`');
CALL AddColumnIfNotExists('user_referrals', 'status', 'VARCHAR(20) NOT NULL DEFAULT "active" COMMENT "状态" AFTER `level`');


-- ==================== 10. user_pledges 表 - 补充字段 ====================
CALL AddColumnIfNotExists('user_pledges', 'apr', 'DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT "年化收益率" AFTER `total_income`');
CALL AddColumnIfNotExists('user_pledges', 'paid_reward', 'DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT "已发放收益" AFTER `earned_income`');


-- ==================== 11. 创建索引优化查询性能 ====================
CALL AddIndexIfNotExists('robot_purchases', 'idx_robot_type', '`robot_type`');
CALL AddIndexIfNotExists('robot_purchases', 'idx_is_quantified', '`is_quantified`');
CALL AddIndexIfNotExists('robot_purchases', 'idx_start_time', '`start_time`');
CALL AddIndexIfNotExists('robot_purchases', 'idx_end_time', '`end_time`');
CALL AddIndexIfNotExists('withdraw_records', 'idx_processed_at', '`processed_at`');
CALL AddIndexIfNotExists('referral_rewards', 'idx_reward_rate', '`reward_rate`');
CALL AddIndexIfNotExists('robot_quantify_logs', 'idx_robot_type', '`robot_type`');


-- ==================== 12. 清理存储过程 ====================
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;


-- ==================== 完成提示 ====================
SELECT '✅ 所有数据库字段已补齐完成！' AS result;
