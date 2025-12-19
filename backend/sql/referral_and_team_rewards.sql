-- ==================== 推荐奖励和团队奖励数据库表 ====================
-- 创建日期：2025年12月13日
-- 功能：管理推荐奖励、团队奖励和机器人收益记录

-- 1. 推荐奖励记录表
-- 记录每次推荐奖励的发放（基于下级的量化收益）
CREATE TABLE IF NOT EXISTS `referral_rewards` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '获得奖励的钱包地址（上级）',
    `from_wallet` VARCHAR(42) NOT NULL COMMENT '产生收益的钱包地址（下级）',
    `level` INT(2) NOT NULL COMMENT '下级层级（1-8）',
    `reward_amount` DECIMAL(20,4) NOT NULL COMMENT '奖励金额',
    `source_type` VARCHAR(20) NOT NULL DEFAULT 'quantify' COMMENT '来源类型：quantify=量化收益',
    `source_id` INT(11) NOT NULL COMMENT '来源记录ID（robot_purchase_id）',
    `robot_name` VARCHAR(100) DEFAULT NULL COMMENT '机器人名称',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_from_wallet` (`from_wallet`),
    KEY `idx_level` (`level`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_source` (`source_type`, `source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐奖励记录表';

-- 2. 团队奖励记录表
-- 记录经纪人等级的团队奖励（每日分红、WLD兑换等）
CREATE TABLE IF NOT EXISTS `team_rewards` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `broker_level` INT(2) NOT NULL COMMENT '经纪人等级（1-5）',
    `reward_type` VARCHAR(20) NOT NULL COMMENT '奖励类型：daily=每日分红, wld=WLD兑换',
    `reward_amount` DECIMAL(20,4) NOT NULL COMMENT '奖励金额',
    `reward_date` DATE NOT NULL COMMENT '奖励日期',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_broker_level` (`broker_level`),
    KEY `idx_reward_date` (`reward_date`),
    KEY `idx_reward_type` (`reward_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队奖励记录表';

-- 3. 机器人量化收益记录表
-- 记录每次量化产生的收益（用于统计团队每日总收入）
CREATE TABLE IF NOT EXISTS `robot_earnings` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `robot_purchase_id` INT(11) UNSIGNED NOT NULL COMMENT '机器人购买记录ID',
    `robot_name` VARCHAR(100) NOT NULL COMMENT '机器人名称',
    `earning_amount` DECIMAL(20,4) NOT NULL COMMENT '收益金额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_robot_purchase_id` (`robot_purchase_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人量化收益记录表';

-- 显示创建结果
SELECT 'Referral and team rewards tables created successfully!' AS result;

