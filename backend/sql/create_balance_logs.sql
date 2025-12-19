-- ==================== 余额变动日志表 ====================
-- 创建日期：2025-12-16
-- 功能：记录用户的每一笔余额变动，便于审计和追溯

CREATE TABLE IF NOT EXISTS `balance_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '钱包地址',
    `change_type` ENUM(
        'deposit',           -- 充值
        'withdraw',          -- 提款
        'robot_purchase',    -- 购买机器人
        'robot_profit',      -- 机器人收益
        'robot_refund',      -- 机器人退款
        'transfer_in',       -- 转入
        'transfer_out',      -- 转出
        'admin_adjust',      -- 管理员调整
        'referral_reward',   -- 推荐奖励
        'team_dividend'      -- 团队分红
    ) NOT NULL COMMENT '变动类型',
    `change_amount` DECIMAL(20,4) NOT NULL COMMENT '变动金额（正数为增加，负数为减少）',
    `balance_before` DECIMAL(20,4) DEFAULT NULL COMMENT '变动前余额',
    `balance_after` DECIMAL(20,4) DEFAULT NULL COMMENT '变动后余额',
    `related_id` INT(11) UNSIGNED DEFAULT NULL COMMENT '关联记录ID（充值ID/机器人ID等）',
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_wallet_address` (`wallet_address`),
    KEY `idx_change_type` (`change_type`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_related_id` (`related_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户余额变动日志';

-- 验证创建成功
SELECT 'balance_logs 表创建成功！' AS result;
SHOW CREATE TABLE balance_logs;

