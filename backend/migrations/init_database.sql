-- =====================================================
-- VituFinance 完整数据库初始化脚本
-- 创建日期：2025-12-19
-- 功能：创建所有前端和管理系统需要的数据库表（共40张）
-- 设计原则：防SQL注入（使用参数化字段类型、约束、索引优化）
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==================== 1. 管理员表 ====================
CREATE TABLE IF NOT EXISTS `admins` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名（唯一）',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希（bcrypt）',
    `role` VARCHAR(20) DEFAULT 'admin' COMMENT '角色：admin/super_admin',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    `last_login` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- ==================== 2. 管理员操作日志表 ====================
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id` INT(11) UNSIGNED NOT NULL COMMENT '管理员ID',
    `admin_username` VARCHAR(50) NOT NULL COMMENT '管理员用户名',
    `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型',
    `operation_target` VARCHAR(100) DEFAULT NULL COMMENT '操作目标',
    `operation_detail` TEXT DEFAULT NULL COMMENT '操作详情',
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_admin_id` (`admin_id`),
    INDEX `idx_operation_type` (`operation_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员操作日志表';

-- ==================== 3. 审计日志表 ====================
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `audit_type` VARCHAR(50) NOT NULL COMMENT '审计类型',
    `operator` VARCHAR(100) DEFAULT NULL COMMENT '操作者',
    `operator_type` VARCHAR(20) DEFAULT 'admin' COMMENT '操作者类型：admin/system/user',
    `target_type` VARCHAR(50) DEFAULT NULL COMMENT '目标类型',
    `target_id` VARCHAR(100) DEFAULT NULL COMMENT '目标ID',
    `action` VARCHAR(50) NOT NULL COMMENT '操作动作',
    `old_value` JSON DEFAULT NULL COMMENT '旧值',
    `new_value` JSON DEFAULT NULL COMMENT '新值',
    `description` TEXT DEFAULT NULL COMMENT '描述',
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `extra_data` JSON DEFAULT NULL COMMENT '额外数据',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_type` (`audit_type`),
    INDEX `idx_operator` (`operator`),
    INDEX `idx_target` (`target_type`, `target_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- ==================== 4. 用户余额表 ====================
CREATE TABLE IF NOT EXISTS `user_balances` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址（小写，42字符）',
    `usdt_balance` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT 'USDT余额',
    `wld_balance` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT 'WLD余额',
    `frozen_usdt` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '冻结USDT',
    `frozen_wld` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '冻结WLD',
    `total_deposit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '总充值',
    `total_withdraw` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '总提款',
    `total_profit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
    `total_referral_reward` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计推荐奖励',
    `is_banned` TINYINT(1) DEFAULT 0 COMMENT '是否封禁',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_is_banned` (`is_banned`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户余额表';

-- ==================== 5. 用户余额清理日志表 ====================
CREATE TABLE IF NOT EXISTS `user_balances_cleanup_log` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `cleanup_type` VARCHAR(50) NOT NULL COMMENT '清理类型',
    `old_balance` DECIMAL(20,4) DEFAULT NULL,
    `new_balance` DECIMAL(20,4) DEFAULT NULL,
    `reason` VARCHAR(255) DEFAULT NULL,
    `operator` VARCHAR(50) DEFAULT 'system',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户余额清理日志表';

-- ==================== 6. 余额变动日志表 ====================
CREATE TABLE IF NOT EXISTS `balance_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `change_type` ENUM('deposit','withdraw','robot_purchase','robot_profit','robot_refund','transfer_in','transfer_out','admin_adjust','referral_reward','team_dividend','checkin','lucky_wheel','pledge','pledge_reward') NOT NULL,
    `change_amount` DECIMAL(20,4) NOT NULL COMMENT '变动金额（正增负减）',
    `balance_before` DECIMAL(20,4) DEFAULT NULL,
    `balance_after` DECIMAL(20,4) DEFAULT NULL,
    `related_id` INT(11) UNSIGNED DEFAULT NULL,
    `remark` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_change_type` (`change_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='余额变动日志表';

-- ==================== 7. 充值记录表 ====================
CREATE TABLE IF NOT EXISTS `deposit_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '充值金额',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT '代币类型',
    `network` VARCHAR(20) NOT NULL DEFAULT 'BSC' COMMENT '网络',
    `tx_hash` VARCHAR(66) NOT NULL COMMENT '交易哈希（唯一）',
    `from_address` VARCHAR(42) DEFAULT NULL COMMENT '来源地址',
    `status` ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME DEFAULT NULL,
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tx_hash` (`tx_hash`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值记录表';

-- ==================== 8. 充值记录清理日志表 ====================
CREATE TABLE IF NOT EXISTS `deposit_records_cleanup_log` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `deposit_id` INT(11) UNSIGNED NOT NULL,
    `wallet_address` VARCHAR(42) NOT NULL,
    `amount` DECIMAL(20,4) NOT NULL,
    `tx_hash` VARCHAR(66) DEFAULT NULL,
    `cleanup_reason` VARCHAR(255) DEFAULT NULL,
    `operator` VARCHAR(50) DEFAULT 'system',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_deposit_id` (`deposit_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值记录清理日志表';

-- ==================== 9. 提款记录表 ====================
CREATE TABLE IF NOT EXISTS `withdraw_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '提款金额',
    `fee` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '手续费',
    `actual_amount` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '实际到账',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT',
    `network` VARCHAR(20) NOT NULL DEFAULT 'BSC',
    `to_address` VARCHAR(42) NOT NULL COMMENT '目标地址',
    `tx_hash` VARCHAR(66) DEFAULT NULL COMMENT '交易哈希',
    `status` ENUM('pending','processing','completed','failed','rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME DEFAULT NULL,
    `remark` VARCHAR(255) DEFAULT NULL,
    `processed_by` VARCHAR(50) DEFAULT NULL COMMENT '处理人',
    `processed_at` DATETIME DEFAULT NULL COMMENT '处理时间',
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提款记录表';

-- ==================== 10. 用户推荐关系表 ====================
CREATE TABLE IF NOT EXISTS `user_referrals` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '被邀请人地址',
    `referrer_address` VARCHAR(42) NOT NULL COMMENT '邀请人地址',
    `referrer_code` VARCHAR(8) NOT NULL COMMENT '邀请码',
    `level` INT(2) NOT NULL DEFAULT 1 COMMENT '推荐层级',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`),
    INDEX `idx_referrer_address` (`referrer_address`),
    INDEX `idx_referrer_code` (`referrer_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户推荐关系表';

-- ==================== 11. 推荐关系清理日志表 ====================
CREATE TABLE IF NOT EXISTS `referrals_cleanup_log` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `referral_id` INT(11) UNSIGNED NOT NULL,
    `wallet_address` VARCHAR(42) NOT NULL,
    `referrer_address` VARCHAR(42) NOT NULL,
    `cleanup_reason` VARCHAR(255) DEFAULT NULL,
    `operator` VARCHAR(50) DEFAULT 'system',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_referral_id` (`referral_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐关系清理日志表';

-- ==================== 12. 用户邀请码表 ====================
CREATE TABLE IF NOT EXISTS `user_invite_codes` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `invite_code` VARCHAR(20) NOT NULL COMMENT '邀请码',
    `custom_code` VARCHAR(20) DEFAULT NULL COMMENT '自定义邀请码',
    `is_active` TINYINT(1) DEFAULT 1,
    `use_count` INT DEFAULT 0 COMMENT '使用次数',
    `max_use_count` INT DEFAULT 0 COMMENT '最大使用次数(0=无限)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`),
    UNIQUE KEY `uk_invite_code` (`invite_code`),
    UNIQUE KEY `uk_custom_code` (`custom_code`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户邀请码表';

-- ==================== 13. 机器人购买记录表 ====================
CREATE TABLE IF NOT EXISTS `robot_purchases` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `robot_id` VARCHAR(50) NOT NULL COMMENT '机器人ID',
    `robot_name` VARCHAR(100) NOT NULL COMMENT '机器人名称',
    `robot_type` VARCHAR(20) NOT NULL DEFAULT 'cex' COMMENT '类型：cex/dex/grid/high',
    `price` DECIMAL(20,4) NOT NULL COMMENT '购买价格',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT',
    `status` ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `start_time` DATETIME DEFAULT NULL COMMENT '精确开始时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '精确结束时间',
    `duration_hours` INT NOT NULL DEFAULT 24 COMMENT '周期（小时）',
    `daily_profit` DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT '日收益率',
    `total_profit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
    `is_quantified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已量化',
    `expected_return` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '预期返还',
    `last_quantify_at` DATETIME DEFAULT NULL,
    `quantify_count` INT NOT NULL DEFAULT 0,
    `cancelled_at` DATETIME DEFAULT NULL,
    `expired_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_status` (`status`),
    INDEX `idx_robot_type` (`robot_type`),
    INDEX `idx_end_date` (`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人购买记录表';

-- ==================== 14. 机器人收益记录表 ====================
CREATE TABLE IF NOT EXISTS `robot_earnings` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `robot_purchase_id` INT(11) UNSIGNED NOT NULL,
    `robot_name` VARCHAR(100) NOT NULL,
    `earning_amount` DECIMAL(20,4) NOT NULL COMMENT '收益金额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_robot_purchase_id` (`robot_purchase_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人收益记录表';

-- ==================== 15. 机器人量化日志表 ====================
CREATE TABLE IF NOT EXISTS `robot_quantify_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `robot_purchase_id` INT(11) UNSIGNED NOT NULL,
    `wallet_address` VARCHAR(42) NOT NULL,
    `robot_name` VARCHAR(100) NOT NULL,
    `robot_type` VARCHAR(20) DEFAULT NULL,
    `earnings` DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
    `cumulative_earnings` DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
    `status` VARCHAR(20) NOT NULL DEFAULT 'success',
    `remark` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_robot_purchase_id` (`robot_purchase_id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人量化日志表';

-- ==================== 16. 跟单记录表 ====================
CREATE TABLE IF NOT EXISTS `follow_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '用户钱包地址',
    `trader_address` VARCHAR(42) NOT NULL COMMENT '跟单交易员地址',
    `trader_name` VARCHAR(100) DEFAULT NULL COMMENT '交易员名称',
    `follow_amount` DECIMAL(20,4) NOT NULL COMMENT '跟单金额',
    `profit_share_rate` DECIMAL(5,2) NOT NULL DEFAULT 20.00 COMMENT '分成比例%',
    `status` ENUM('active','stopped','expired') NOT NULL DEFAULT 'active',
    `total_profit` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计收益',
    `total_loss` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '累计亏损',
    `trade_count` INT NOT NULL DEFAULT 0 COMMENT '交易次数',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
    `stopped_at` DATETIME DEFAULT NULL COMMENT '停止时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_trader_address` (`trader_address`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跟单记录表';

-- ==================== 17. 推荐奖励记录表 ====================
CREATE TABLE IF NOT EXISTS `referral_rewards` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '获奖人',
    `from_wallet` VARCHAR(42) NOT NULL COMMENT '来源用户',
    `level` INT(2) NOT NULL COMMENT '层级1-8',
    `reward_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '奖励比例%',
    `reward_amount` DECIMAL(20,4) NOT NULL COMMENT '奖励金额',
    `source_type` VARCHAR(20) NOT NULL DEFAULT 'quantify',
    `source_id` INT(11) NOT NULL,
    `robot_name` VARCHAR(100) DEFAULT NULL,
    `source_amount` DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_from_wallet` (`from_wallet`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐奖励记录表';

-- ==================== 18. 团队奖励记录表 ====================
CREATE TABLE IF NOT EXISTS `team_rewards` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `broker_level` INT(2) NOT NULL COMMENT '经纪人等级1-5',
    `reward_type` VARCHAR(20) NOT NULL COMMENT 'daily_dividend/wld_exchange',
    `reward_amount` DECIMAL(20,4) NOT NULL,
    `reward_date` DATE NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_reward_date` (`reward_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队奖励记录表';

-- ==================== 19. 每日签到表 ====================
CREATE TABLE IF NOT EXISTS `daily_checkin` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `checkin_date` DATE NOT NULL,
    `day_number` INT(11) NOT NULL DEFAULT 1 COMMENT '连续签到天数',
    `reward_amount` DECIMAL(10,4) NOT NULL DEFAULT 2.0000 COMMENT '奖励WLD',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_date` (`wallet_address`,`checkin_date`),
    INDEX `idx_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到表';

-- ==================== 20. 质押产品表 ====================
CREATE TABLE IF NOT EXISTS `pledge_products` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT '产品名称',
    `min_amount` DECIMAL(20,4) NOT NULL COMMENT '最小质押金额',
    `max_amount` DECIMAL(20,4) NOT NULL COMMENT '最大质押金额',
    `daily_rate` DECIMAL(10,6) NOT NULL COMMENT '日收益率',
    `duration_days` INT NOT NULL COMMENT '质押天数',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质押产品表';

-- ==================== 21. 用户质押记录表 ====================
CREATE TABLE IF NOT EXISTS `user_pledges` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `product_id` INT(11) UNSIGNED NOT NULL,
    `amount` DECIMAL(20,4) NOT NULL COMMENT '质押金额',
    `daily_rate` DECIMAL(10,6) NOT NULL,
    `total_income` DECIMAL(20,4) DEFAULT 0.0000 COMMENT '预计总收益',
    `earned_income` DECIMAL(20,4) DEFAULT 0.0000 COMMENT '已获收益',
    `apr` DECIMAL(10,4) DEFAULT 0.0000 COMMENT '年化收益率',
    `paid_reward` DECIMAL(20,4) DEFAULT 0.0000 COMMENT '已发放',
    `status` ENUM('active','completed','cancelled') DEFAULT 'active',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户质押记录表';

-- ==================== 22. 用户保险箱表 ====================
CREATE TABLE IF NOT EXISTS `user_safes` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL COMMENT '保险箱密码哈希',
    `locked_usdt` DECIMAL(20,4) DEFAULT 0.0000,
    `locked_wld` DECIMAL(20,4) DEFAULT 0.0000,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户保险箱表';

-- ==================== 23. WLD兑换记录表 ====================
CREATE TABLE IF NOT EXISTS `wld_exchange_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `usdt_amount` DECIMAL(20,4) NOT NULL COMMENT 'USDT数量',
    `wld_amount` DECIMAL(20,4) NOT NULL COMMENT 'WLD数量',
    `exchange_rate` DECIMAL(10,4) NOT NULL COMMENT '兑换汇率',
    `status` ENUM('pending','completed','failed') DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WLD兑换记录表';

-- ==================== 24. 幸运转盘记录表 ====================
CREATE TABLE IF NOT EXISTS `lucky_wheel_records` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `wheel_type` VARCHAR(20) NOT NULL COMMENT '转盘类型：silver/gold/diamond',
    `prize` VARCHAR(50) NOT NULL COMMENT '奖品名称',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '奖励金额',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='幸运转盘记录表';

-- ==================== 25. 幸运转盘公告表 ====================
CREATE TABLE IF NOT EXISTS `lucky_wheel_announcements` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '中奖用户（脱敏）',
    `prize_name` VARCHAR(50) NOT NULL COMMENT '奖品名称',
    `reward_display` VARCHAR(50) NOT NULL COMMENT '奖励展示',
    `is_virtual` TINYINT(1) DEFAULT 0 COMMENT '是否虚拟数据',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='幸运转盘公告表';

-- ==================== 26. 幸运转盘控奖表 ====================
CREATE TABLE IF NOT EXISTS `lucky_wheel_rigged` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '指定用户',
    `prize_id` INT NOT NULL COMMENT '指定奖品ID',
    `prize_name` VARCHAR(50) NOT NULL,
    `created_by` VARCHAR(50) DEFAULT 'admin',
    `used` TINYINT(1) DEFAULT 0 COMMENT '是否已使用',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `used_at` TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='幸运转盘控奖表';

-- ==================== 27. 用户幸运积分表 ====================
CREATE TABLE IF NOT EXISTS `user_lucky_points` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL,
    `silver_points` INT DEFAULT 0 COMMENT '银色积分',
    `gold_points` INT DEFAULT 0 COMMENT '金色积分',
    `diamond_points` INT DEFAULT 0 COMMENT '钻石积分',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户幸运积分表';

-- ==================== 28. 用户行为记录表 ====================
CREATE TABLE IF NOT EXISTS `user_behaviors` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IPv4/IPv6',
    `user_agent` TEXT DEFAULT NULL,
    `referral_code` VARCHAR(20) DEFAULT NULL,
    `action_type` VARCHAR(50) NOT NULL COMMENT '行为类型',
    `action_detail` TEXT DEFAULT NULL,
    `page_url` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_action_type` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户行为记录表';

-- ==================== 29. 公告表 ====================
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(20) DEFAULT 'info' COMMENT '类型：info/warning/important',
    `icon` VARCHAR(50) DEFAULT NULL,
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `content` TEXT NOT NULL COMMENT '内容',
    `link` VARCHAR(255) DEFAULT NULL COMMENT '跳转链接',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告表';

-- ==================== 30. 系统设置表 ====================
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL COMMENT '设置键',
    `setting_value` TEXT COMMENT '设置值',
    `setting_type` VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT '类型：text/number/boolean/json',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '描述',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- ==================== 31. 转账日志表 ====================
CREATE TABLE IF NOT EXISTS `transfer_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `from_address` VARCHAR(42) NOT NULL COMMENT '发送地址',
    `to_address` VARCHAR(42) NOT NULL COMMENT '接收地址',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '金额',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT '代币类型',
    `network` VARCHAR(20) NOT NULL DEFAULT 'BSC' COMMENT '网络',
    `tx_hash` VARCHAR(66) DEFAULT NULL COMMENT '交易哈希',
    `transfer_type` VARCHAR(30) NOT NULL COMMENT '转账类型',
    `status` ENUM('pending','processing','success','failed') NOT NULL DEFAULT 'pending',
    `gas_used` DECIMAL(20,8) DEFAULT NULL COMMENT 'Gas费用',
    `gas_price` DECIMAL(20,8) DEFAULT NULL COMMENT 'Gas价格',
    `error_message` TEXT DEFAULT NULL,
    `retry_count` INT DEFAULT 0 COMMENT '重试次数',
    `related_id` INT(11) UNSIGNED DEFAULT NULL,
    `related_type` VARCHAR(30) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tx_hash` (`tx_hash`),
    INDEX `idx_from_address` (`from_address`),
    INDEX `idx_to_address` (`to_address`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='转账日志表';

-- ==================== 32. 交易历史表 ====================
CREATE TABLE IF NOT EXISTS `transaction_history` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `tx_type` VARCHAR(30) NOT NULL COMMENT '交易类型',
    `tx_hash` VARCHAR(66) DEFAULT NULL COMMENT '交易哈希',
    `amount` DECIMAL(20,4) NOT NULL COMMENT '金额',
    `token` VARCHAR(10) NOT NULL DEFAULT 'USDT',
    `direction` ENUM('in','out') NOT NULL COMMENT '方向',
    `from_address` VARCHAR(42) DEFAULT NULL,
    `to_address` VARCHAR(42) DEFAULT NULL,
    `status` ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
    `description` VARCHAR(255) DEFAULT NULL,
    `related_id` INT(11) UNSIGNED DEFAULT NULL,
    `related_type` VARCHAR(30) DEFAULT NULL,
    `block_number` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_wallet_address` (`wallet_address`),
    INDEX `idx_tx_type` (`tx_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易历史表';

-- ==================== 33. 代理节点表 ====================
CREATE TABLE IF NOT EXISTS `proxy_nodes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL COMMENT '节点名称',
    `proxy_type` VARCHAR(20) NOT NULL DEFAULT 'ss' COMMENT '代理类型',
    `server` VARCHAR(255) NOT NULL COMMENT '服务器地址',
    `port` INT NOT NULL COMMENT '端口',
    `password` VARCHAR(255) DEFAULT NULL,
    `cipher` VARCHAR(50) DEFAULT 'aes-256-gcm',
    `extra_config` JSON DEFAULT NULL,
    `status` TINYINT(1) DEFAULT 1 COMMENT '1=启用,0=禁用',
    `sort_order` INT DEFAULT 100,
    `traffic_limit` BIGINT DEFAULT 0,
    `expires_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理节点表';

-- ==================== 34. 代理订阅表 ====================
CREATE TABLE IF NOT EXISTS `proxy_subscriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(100) NOT NULL COMMENT '用户标识',
    `subscription_token` VARCHAR(64) NOT NULL UNIQUE,
    `name` VARCHAR(100) DEFAULT 'Default',
    `access_level` INT DEFAULT 1,
    `traffic_used` BIGINT DEFAULT 0,
    `traffic_limit` BIGINT DEFAULT 0,
    `status` TINYINT(1) DEFAULT 1,
    `expires_at` DATETIME DEFAULT NULL,
    `last_update_at` DATETIME DEFAULT NULL,
    `last_device` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理订阅表';

-- ==================== 35. 代理访问日志表 ====================
CREATE TABLE IF NOT EXISTS `proxy_access_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `subscription_id` INT NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `accessed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_subscription_id` (`subscription_id`),
    INDEX `idx_accessed_at` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理访问日志表';

-- ==================== 36. 模拟增长配置表 ====================
CREATE TABLE IF NOT EXISTS `simulated_growth_config` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_type` ENUM('follow','robot') NOT NULL COMMENT '页面类型',
    `base_amount` DECIMAL(20,2) NOT NULL DEFAULT 146503014.41,
    `current_simulated_amount` DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    `growth_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `min_increment` INT NOT NULL DEFAULT 1000,
    `max_increment` INT NOT NULL DEFAULT 10000,
    `growth_interval_seconds` INT NOT NULL DEFAULT 10,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_page_type` (`page_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟增长配置表';

-- ==================== 37. 模拟增长日志表 ====================
CREATE TABLE IF NOT EXISTS `simulated_growth_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_type` ENUM('follow','robot') NOT NULL,
    `increment_amount` DECIMAL(20,2) NOT NULL,
    `total_simulated_before` DECIMAL(20,2) NOT NULL,
    `total_simulated_after` DECIMAL(20,2) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_page_type` (`page_type`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟增长日志表';

-- ==================== 38. 定时任务日志表 ====================
CREATE TABLE IF NOT EXISTS `cron_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `cron_name` VARCHAR(100) NOT NULL COMMENT '任务名称',
    `status` ENUM('running','success','failed') NOT NULL DEFAULT 'running',
    `message` TEXT DEFAULT NULL,
    `stats` JSON DEFAULT NULL COMMENT '统计数据',
    `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `finished_at` DATETIME DEFAULT NULL,
    `duration_seconds` DECIMAL(10,3) DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_cron_name` (`cron_name`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务日志表';

-- ==================== 39. 定时任务执行日志表 ====================
CREATE TABLE IF NOT EXISTS `cron_execution_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `cron_name` VARCHAR(100) NOT NULL COMMENT '任务名称',
    `execution_time` DATETIME NOT NULL COMMENT '执行时间',
    `status` ENUM('running','success','failed','timeout') NOT NULL DEFAULT 'running',
    `result_message` TEXT DEFAULT NULL,
    `affected_rows` INT DEFAULT 0,
    `execution_duration_ms` INT DEFAULT 0,
    `error_message` TEXT DEFAULT NULL,
    `stats` JSON DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_cron_name` (`cron_name`),
    INDEX `idx_status` (`status`),
    INDEX `idx_execution_time` (`execution_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务执行日志表';

-- ==================== 40. 错误日志表 ====================
CREATE TABLE IF NOT EXISTS `error_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(50) NOT NULL COMMENT '来源：frontend/backend/admin',
    `level` VARCHAR(20) NOT NULL DEFAULT 'error' COMMENT '级别',
    `message` TEXT NOT NULL COMMENT '错误信息',
    `stack` TEXT DEFAULT NULL COMMENT '堆栈跟踪',
    `url` VARCHAR(500) DEFAULT NULL,
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `wallet_address` VARCHAR(42) DEFAULT NULL,
    `extra_data` JSON DEFAULT NULL,
    `resolved` TINYINT(1) DEFAULT 0,
    `resolved_at` DATETIME DEFAULT NULL,
    `resolved_by` VARCHAR(50) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_source` (`source`),
    INDEX `idx_level` (`level`),
    INDEX `idx_resolved` (`resolved`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误日志表';

-- ==================== 插入默认数据 ====================

-- 插入默认系统设置
INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`) VALUES
('platform_wallet_address', '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4', 'text', '平台收款钱包地址'),
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

-- 插入模拟增长配置
INSERT IGNORE INTO `simulated_growth_config` (`page_type`, `base_amount`, `current_simulated_amount`, `growth_enabled`) VALUES
('follow', 146503014.41, 0.00, 1),
('robot', 146503014.41, 0.00, 1);

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 完成 ====================
SELECT '✅ 数据库初始化完成！共创建40张表。' AS result;
