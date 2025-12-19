-- ==================== 用户余额管理数据库表 ====================
-- 创建日期：2025年12月12日
-- 功能：管理用户的平台余额、充值记录、提款记录

-- 1. 用户余额表
CREATE TABLE IF NOT EXISTS `user_balances` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `usdt_balance` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT 'USDT余额',
    `wld_balance` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT 'WLD余额',
    `total_deposit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '总充值金额',
    `total_withdraw` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '总提款金额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户余额表';

-- 2. 充值记录表
CREATE TABLE IF NOT EXISTS `deposit_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '充值金额',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT '代币类型',
    `tx_hash` VARCHAR(66) NOT NULL COMMENT '交易哈希',
    `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tx_hash` (`tx_hash`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值记录表';

-- 3. 提款记录表
CREATE TABLE IF NOT EXISTS `withdraw_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '提款金额',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT '代币类型',
    `to_address` VARCHAR(42) NOT NULL COMMENT '提款目标地址',
    `tx_hash` VARCHAR(66) DEFAULT NULL COMMENT '交易哈希',
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提款记录表';

-- 4. 机器人购买记录表
CREATE TABLE IF NOT EXISTS `robot_purchases` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
    `robot_id` VARCHAR(50) NOT NULL COMMENT '机器人ID',
    `robot_name` VARCHAR(100) NOT NULL COMMENT '机器人名称',
    `price` DECIMAL(20,4) NOT NULL COMMENT '购买价格',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT '支付代币',
    `status` ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active' COMMENT '状态',
    `start_date` DATE NOT NULL COMMENT '开始日期',
    `end_date` DATE NOT NULL COMMENT '结束日期',
    `daily_profit` DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '日收益率',
    `total_profit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_status` (`status`),
    KEY `idx_end_date` (`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人购买记录表';

-- 显示创建结果
SELECT 'Tables created successfully!' AS result;

