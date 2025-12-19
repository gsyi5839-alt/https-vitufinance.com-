-- ============================================================================
-- 机器人时间精度升级迁移脚本
-- 将 DATE 类型改为 DATETIME，支持小时级别精度
-- 
-- 执行前请先备份数据：
-- mysqldump -u root -p vitufinance robot_purchases > robot_purchases_backup.sql
-- 
-- 执行命令：
-- mysql -u root -p vitufinance < update_robot_time_to_hours.sql
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 1. 添加新的 DATETIME 字段
ALTER TABLE robot_purchases 
    ADD COLUMN start_time DATETIME COMMENT '精确开始时间（包含小时分钟秒）' AFTER end_date,
    ADD COLUMN end_time DATETIME COMMENT '精确结束时间（包含小时分钟秒）' AFTER start_time,
    ADD COLUMN duration_hours INT UNSIGNED DEFAULT 24 COMMENT '运行周期（小时）' AFTER end_time;

-- 2. 迁移现有数据：将 DATE 转换为 DATETIME
-- start_date 设置为当天 00:00:00
-- end_date 设置为到期日 23:59:59
UPDATE robot_purchases 
SET 
    start_time = TIMESTAMP(start_date, TIME(created_at)),
    end_time = TIMESTAMP(end_date, '23:59:59'),
    duration_hours = DATEDIFF(end_date, start_date) * 24
WHERE start_time IS NULL;

-- 3. 为状态为 active 的机器人，根据 created_at 和配置重新计算精确的 end_time
-- 这需要根据机器人名称匹配运行时长，此处使用通用逻辑

-- CEX 机器人时长配置（单位：小时）
UPDATE robot_purchases SET duration_hours = 24, end_time = DATE_ADD(start_time, INTERVAL 24 HOUR)
WHERE robot_name = 'Binance Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 72, end_time = DATE_ADD(start_time, INTERVAL 72 HOUR)
WHERE robot_name = 'Coinbase Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 48, end_time = DATE_ADD(start_time, INTERVAL 48 HOUR)
WHERE robot_name = 'OKX Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 168, end_time = DATE_ADD(start_time, INTERVAL 168 HOUR)
WHERE robot_name = 'Bybit Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 360, end_time = DATE_ADD(start_time, INTERVAL 360 HOUR)
WHERE robot_name = 'Upbit Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 720, end_time = DATE_ADD(start_time, INTERVAL 720 HOUR)
WHERE robot_name = 'Bitfinex Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 1080, end_time = DATE_ADD(start_time, INTERVAL 1080 HOUR)
WHERE robot_name = 'Kucoin Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 2160, end_time = DATE_ADD(start_time, INTERVAL 2160 HOUR)
WHERE robot_name = 'Bitget Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 2880, end_time = DATE_ADD(start_time, INTERVAL 2880 HOUR)
WHERE robot_name = 'Gate Ai Bot' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 4320, end_time = DATE_ADD(start_time, INTERVAL 4320 HOUR)
WHERE robot_name = 'Binance Ai Bot-01' AND status = 'active';

-- DEX 机器人时长配置
UPDATE robot_purchases SET duration_hours = 720, end_time = DATE_ADD(start_time, INTERVAL 720 HOUR)
WHERE robot_name IN ('PancakeSwap Ai Bot', 'Uniswap Ai Bot', 'BaseSwap Ai Bot', 'Curve Ai Bot', 'DODO Ai Bot') AND status = 'active';

UPDATE robot_purchases SET duration_hours = 1440, end_time = DATE_ADD(start_time, INTERVAL 1440 HOUR)
WHERE robot_name IN ('SushiSwap Ai Bot', 'Jupiter Ai Bot') AND status = 'active';

-- Grid 机器人时长配置
UPDATE robot_purchases SET duration_hours = 2880, end_time = DATE_ADD(start_time, INTERVAL 2880 HOUR)
WHERE robot_name = 'Binance Grid Bot-M1' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 3600, end_time = DATE_ADD(start_time, INTERVAL 3600 HOUR)
WHERE robot_name = 'Binance Grid Bot-M2' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 4320, end_time = DATE_ADD(start_time, INTERVAL 4320 HOUR)
WHERE robot_name = 'Binance Grid Bot-M3' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 5040, end_time = DATE_ADD(start_time, INTERVAL 5040 HOUR)
WHERE robot_name = 'Binance Grid Bot-M4' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 5760, end_time = DATE_ADD(start_time, INTERVAL 5760 HOUR)
WHERE robot_name = 'Binance Grid Bot-M5' AND status = 'active';

-- High 机器人时长配置
UPDATE robot_purchases SET duration_hours = 24, end_time = DATE_ADD(start_time, INTERVAL 24 HOUR)
WHERE robot_name = 'Binance High Robot-H1' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 72, end_time = DATE_ADD(start_time, INTERVAL 72 HOUR)
WHERE robot_name = 'Binance High Robot-H2' AND status = 'active';

UPDATE robot_purchases SET duration_hours = 120, end_time = DATE_ADD(start_time, INTERVAL 120 HOUR)
WHERE robot_name = 'Binance High Robot-H3' AND status = 'active';

-- 4. 创建索引以优化查询
CREATE INDEX idx_robot_end_time ON robot_purchases(end_time);
CREATE INDEX idx_robot_status_end_time ON robot_purchases(status, end_time);
CREATE INDEX idx_robot_wallet_type_status ON robot_purchases(wallet_address, robot_type, status);

-- 5. 添加量化时间间隔字段（小时）
ALTER TABLE robot_purchases 
    ADD COLUMN quantify_interval_hours INT UNSIGNED DEFAULT 24 COMMENT '量化间隔（小时），High机器人为NULL表示只能量化一次' AFTER duration_hours,
    ADD COLUMN last_quantify_time DATETIME COMMENT '最后一次量化时间' AFTER quantify_interval_hours;

-- 6. 从量化日志更新最后量化时间
UPDATE robot_purchases rp
SET rp.last_quantify_time = (
    SELECT MAX(ql.created_at) 
    FROM robot_quantify_logs ql 
    WHERE ql.robot_purchase_id = rp.id
)
WHERE EXISTS (
    SELECT 1 FROM robot_quantify_logs ql WHERE ql.robot_purchase_id = rp.id
);

-- 提交事务
COMMIT;

-- 显示结果
SELECT 
    id, 
    robot_name, 
    robot_type,
    start_date,
    end_date,
    start_time,
    end_time,
    duration_hours,
    quantify_interval_hours,
    last_quantify_time,
    status
FROM robot_purchases 
ORDER BY created_at DESC 
LIMIT 20;

-- 输出迁移完成信息
SELECT 'Migration completed successfully!' AS message;
SELECT COUNT(*) AS total_records FROM robot_purchases;
SELECT COUNT(*) AS active_records FROM robot_purchases WHERE status = 'active';
SELECT COUNT(*) AS records_with_valid_times FROM robot_purchases WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

