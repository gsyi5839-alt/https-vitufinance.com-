-- =====================================================
-- 团队分红数据检查脚本
-- =====================================================

-- 1. 检查团队分红总体统计
SELECT 
    '总体统计' as category,
    COUNT(DISTINCT wallet_address) as total_members,
    COUNT(*) as total_records,
    SUM(reward_amount) as total_amount
FROM team_rewards
WHERE reward_type = 'daily_dividend';

-- 2. 检查今日分红统计
SELECT 
    '今日统计' as category,
    COUNT(DISTINCT wallet_address) as today_members,
    SUM(reward_amount) as today_amount
FROM team_rewards
WHERE reward_type = 'daily_dividend'
AND DATE(reward_date) = CURDATE();

-- 3. 检查最近10条分红记录
SELECT 
    wallet_address,
    broker_level,
    reward_amount,
    reward_date,
    created_at
FROM team_rewards
WHERE reward_type = 'daily_dividend'
ORDER BY created_at DESC
LIMIT 10;

-- 4. 检查推荐关系统计
SELECT 
    COUNT(DISTINCT wallet_address) as total_users,
    COUNT(DISTINCT referrer_address) as total_referrers,
    COUNT(*) as total_relationships
FROM user_referrals;

-- 5. 检查推荐奖励统计
SELECT 
    COUNT(DISTINCT wallet_address) as total_users_with_rewards,
    SUM(reward_amount) as total_reward_amount,
    COUNT(*) as total_records
FROM referral_rewards;

-- 6. 检查今日新增推荐
SELECT 
    COUNT(*) as today_new_referrals
FROM user_referrals
WHERE DATE(created_at) = CURDATE();

-- 7. 按等级统计经纪人分布
SELECT 
    broker_level,
    COUNT(DISTINCT wallet_address) as member_count,
    SUM(reward_amount) as total_amount
FROM team_rewards
WHERE reward_type = 'daily_dividend'
AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY broker_level
ORDER BY broker_level DESC;

-- 8. 检查是否有未发放的经纪人
SELECT 
    ur.referrer_address,
    COUNT(DISTINCT ur.wallet_address) as direct_count,
    COUNT(DISTINCT rp.id) as qualified_robots,
    IFNULL(tr.total_dividend, 0) as received_dividend
FROM user_referrals ur
LEFT JOIN robot_purchases rp ON ur.wallet_address = rp.wallet_address 
    AND rp.status = 'active' 
    AND rp.price >= 50
LEFT JOIN (
    SELECT wallet_address, SUM(reward_amount) as total_dividend
    FROM team_rewards
    WHERE reward_type = 'daily_dividend'
    GROUP BY wallet_address
) tr ON ur.referrer_address = tr.wallet_address
GROUP BY ur.referrer_address
HAVING direct_count >= 3 AND qualified_robots >= 3
LIMIT 20;

