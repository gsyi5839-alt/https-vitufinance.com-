-- 邀请关系表
-- 记录用户之间的邀请关系

CREATE TABLE IF NOT EXISTS `user_referrals` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `wallet_address` VARCHAR(42) NOT NULL COMMENT '被邀请人钱包地址（小写）',
    `referrer_address` VARCHAR(42) NOT NULL COMMENT '邀请人钱包地址（小写）',
    `referrer_code` VARCHAR(8) NOT NULL COMMENT '邀请码（邀请人钱包地址后8位）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_wallet_address` (`wallet_address`),
    KEY `idx_referrer_address` (`referrer_address`),
    KEY `idx_referrer_code` (`referrer_code`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户邀请关系表';

