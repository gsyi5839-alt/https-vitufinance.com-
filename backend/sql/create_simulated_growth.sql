/**
 * Follow和Robot页面的模拟金额增长存储表
 * 
 * 功能：
 * 1. 存储模拟基础金额（初始146,503,014.41）
 * 2. 存储每次自动增长的金额
 * 3. 支持Follow和Robot两个页面独立配置
 * 4. 定时任务每10秒自动增长并记录
 */

-- 创建模拟增长配置表
CREATE TABLE IF NOT EXISTS `simulated_growth_config` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_type` ENUM('follow', 'robot') NOT NULL COMMENT '页面类型：follow=Follow页面, robot=Robot页面',
    `base_amount` DECIMAL(20,2) NOT NULL DEFAULT 146503014.41 COMMENT '模拟基础金额',
    `current_simulated_amount` DECIMAL(20,2) NOT NULL DEFAULT 0.00 COMMENT '当前累计模拟增长金额',
    `growth_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用自动增长',
    `min_increment` INT(11) NOT NULL DEFAULT 1000 COMMENT '最小增长金额',
    `max_increment` INT(11) NOT NULL DEFAULT 10000 COMMENT '最大增长金额',
    `growth_interval_seconds` INT(11) NOT NULL DEFAULT 10 COMMENT '增长间隔（秒）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_page_type` (`page_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟金额增长配置表';

-- 创建模拟增长记录表（用于审计和统计）
CREATE TABLE IF NOT EXISTS `simulated_growth_logs` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_type` ENUM('follow', 'robot') NOT NULL,
    `increment_amount` DECIMAL(20,2) NOT NULL COMMENT '本次增长金额',
    `total_simulated_before` DECIMAL(20,2) NOT NULL COMMENT '增长前的模拟总额',
    `total_simulated_after` DECIMAL(20,2) NOT NULL COMMENT '增长后的模拟总额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_page_type` (`page_type`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟金额增长日志表';

-- 插入初始配置（Follow页面）
INSERT INTO `simulated_growth_config` 
(`page_type`, `base_amount`, `current_simulated_amount`, `growth_enabled`, `min_increment`, `max_increment`, `growth_interval_seconds`) 
VALUES 
('follow', 146503014.41, 0.00, 1, 1000, 10000, 10)
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入初始配置（Robot页面）
INSERT INTO `simulated_growth_config` 
(`page_type`, `base_amount`, `current_simulated_amount`, `growth_enabled`, `min_increment`, `max_increment`, `growth_interval_seconds`) 
VALUES 
('robot', 146503014.41, 0.00, 1, 1000, 10000, 10)
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 查看初始配置
SELECT * FROM simulated_growth_config;

