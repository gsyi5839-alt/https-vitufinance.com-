-- ==================== 添加机器人类型字段 ====================
-- 创建日期：2025年12月13日
-- 功能：区分 Grid 机器人（每天量化）和 High 机器人（到期返还）

-- 添加 robot_type 字段
-- 'grid': 网格机器人，每天量化返利，到期退回本金
-- 'high': 高收益机器人，只量化一次，到期返还本金+利息
-- 'cex': CEX机器人（Robot页面）
-- 'dex': DEX机器人（Robot页面）
ALTER TABLE `robot_purchases` 
ADD COLUMN `robot_type` VARCHAR(20) NOT NULL DEFAULT 'cex' COMMENT '机器人类型: cex, dex, grid, high' AFTER `robot_name`;

-- 添加 is_quantified 字段，用于 High 机器人记录是否已量化
ALTER TABLE `robot_purchases` 
ADD COLUMN `is_quantified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'High机器人是否已量化（0:否, 1:是）' AFTER `total_profit`;

-- 添加 expected_return 字段，记录High机器人到期应返还的金额（本金+利息）
ALTER TABLE `robot_purchases` 
ADD COLUMN `expected_return` DECIMAL(20,4) NOT NULL DEFAULT 0.0000 COMMENT '到期应返还金额（High机器人）' AFTER `is_quantified`;

-- 显示更新结果
SELECT 'Columns added successfully!' AS result;

