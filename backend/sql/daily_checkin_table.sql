-- ==================== 每日签到数据库表 ====================
-- 创建日期：2025年12月13日
-- 功能：管理用户每日签到记录

-- 每日签到记录表
CREATE TABLE IF NOT EXISTS `daily_checkin` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `checkin_date` DATE NOT NULL COMMENT '签到日期',
    `day_number` INT(11) NOT NULL DEFAULT 1 COMMENT '连续签到天数（1-10）',
    `reward_amount` DECIMAL(10,4) NOT NULL DEFAULT 2.0000 COMMENT '奖励WLD数量',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_date` (`wallet_address`, `checkin_date`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_checkin_date` (`checkin_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到记录表';

-- 显示创建结果
SELECT 'Daily checkin table created successfully!' AS result;

