-- =====================================================
-- 数据库索引优化脚本
-- 
-- 目的: 优化查询性能,减少全表扫描
-- 创建时间: 2025-12-18
-- 
-- 使用方法:
-- mysql -u root -p your_database < dbIndexes.sql
-- =====================================================

-- 1. 用户余额表索引
-- 优化: 钱包地址查询、余额排序
ALTER TABLE user_balances 
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_created_at (created_at),
  ADD INDEX idx_total_deposit (total_deposit DESC),
  ADD INDEX idx_is_banned (is_banned);

-- 2. 充值记录表索引
-- 优化: 状态查询、时间范围查询、钱包地址查询
ALTER TABLE deposit_records
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_tx_hash (tx_hash),
  ADD INDEX idx_status_created (status, created_at DESC);

-- 3. 提款记录表索引
-- 优化: 状态查询、时间范围查询、钱包地址查询
ALTER TABLE withdraw_records
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_status_created (status, created_at DESC);

-- 4. 机器人购买记录表索引
-- 优化: 用户查询、状态查询、时间查询
ALTER TABLE robot_purchases
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_expire_at (expire_at),
  ADD INDEX idx_wallet_status (wallet_address, status);

-- 5. 推荐关系表索引
-- 优化: 推荐人查询、被推荐人查询
ALTER TABLE user_referrals
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_referrer_address (referrer_address),
  ADD INDEX idx_referrer_code (referrer_code),
  ADD INDEX idx_created_at (created_at DESC);

-- 6. 推荐奖励表索引
-- 优化: 钱包地址查询、时间查询
ALTER TABLE referral_rewards
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_wallet_created (wallet_address, created_at DESC);

-- 7. 量化日志表索引
-- 优化: 机器人ID查询、时间查询
ALTER TABLE quantify_logs
  ADD INDEX idx_robot_id (robot_id),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_robot_created (robot_id, created_at DESC);

-- 8. 跟单记录表索引
-- 优化: 用户查询、状态查询
ALTER TABLE follow_records
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC);

-- 9. 质押记录表索引
-- 优化: 用户查询、状态查询
ALTER TABLE pledge_records
  ADD INDEX idx_wallet_address (wallet_address),
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC);

-- 10. 公告表索引
-- 优化: 状态查询、时间查询
ALTER TABLE announcements
  ADD INDEX idx_status (status),
  ADD INDEX idx_created_at (created_at DESC);

-- 11. 错误日志表索引
-- 优化: 来源查询、级别查询、时间查询
ALTER TABLE error_logs
  ADD INDEX idx_source (source),
  ADD INDEX idx_level (level),
  ADD INDEX idx_created_at (created_at DESC),
  ADD INDEX idx_resolved (resolved);

-- 12. 系统设置表索引
-- 优化: 键查询
ALTER TABLE system_settings
  ADD UNIQUE INDEX idx_setting_key (setting_key);

-- =====================================================
-- 查看索引创建结果
-- =====================================================

-- 查看所有表的索引
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME;

-- =====================================================
-- 性能分析建议
-- =====================================================

-- 1. 定期分析表统计信息
-- ANALYZE TABLE user_balances, deposit_records, withdraw_records, robot_purchases;

-- 2. 优化表碎片
-- OPTIMIZE TABLE user_balances, deposit_records, withdraw_records, robot_purchases;

-- 3. 查看慢查询日志
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 1;
-- SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';

