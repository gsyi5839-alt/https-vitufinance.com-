/**
 * 管理后台 - 仪表盘路由
 * 
 * 功能:
 * - 获取仪表盘统计数据
 * - 获取图表数据
 * - 获取最近记录
 * 
 * 优化:
 * - 添加缓存支持
 * - 优化查询性能
 * 
 * 创建时间: 2025-12-18
 */
import express from 'express';
import { query as dbQuery } from '../../config/dbOptimized.js';
import cache from '../../config/cache.js';

const router = express.Router();

/**
 * 获取仪表盘统计数据
 * GET /api/admin/dashboard/stats
 * 
 * 优化: 添加5分钟缓存
 */
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('dashboard:stats');
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    // 并行执行所有查询以提高性能
    const [
      userStats,
      depositStats,
      withdrawStats,
      robotStats,
      followStats,
      referralStats,
      pendingWithdrawals,
      recentDeposits,
      recentWithdrawals,
      chartData
    ] = await Promise.all([
      // 用户统计
      dbQuery(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_users,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() - INTERVAL 1 DAY THEN 1 END) as yesterday_users
        FROM user_balances
      `),
      
      // 充值统计
      dbQuery(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_deposit,
          COALESCE(SUM(CASE WHEN status = 'completed' AND DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as today_deposit,
          COALESCE(SUM(CASE WHEN status = 'completed' AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY THEN amount ELSE 0 END), 0) as yesterday_deposit
        FROM deposit_records
      `),
      
      // 提款统计
      dbQuery(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_withdraw
        FROM withdraw_records
      `),
      
      // 机器人统计
      dbQuery(`
        SELECT COUNT(*) as total_robots FROM robot_purchases WHERE status = 'active'
      `),
      
      // 跟单统计
      dbQuery(`
        SELECT COUNT(*) as total_follows FROM follow_records
      `),
      
      // 推荐统计
      dbQuery(`
        SELECT COUNT(*) as total_referrals FROM user_referrals
      `),
      
      // 待处理提款
      dbQuery(`
        SELECT COUNT(*) as pending_withdrawals FROM withdraw_records WHERE status = 'pending'
      `),
      
      // 最近充值 (5条)
      dbQuery(`
        SELECT wallet_address, amount, status, created_at 
        FROM deposit_records 
        ORDER BY created_at DESC 
        LIMIT 5
      `),
      
      // 最近提款 (5条)
      dbQuery(`
        SELECT wallet_address, amount, status, created_at 
        FROM withdraw_records 
        ORDER BY created_at DESC 
        LIMIT 5
      `),
      
      // 图表数据 - 最近7天
      getChartData()
    ]);
    
    // 计算平台余额 (总充值 - 总提款)
    const platformBalance = parseFloat(depositStats[0].total_deposit) - parseFloat(withdrawStats[0].total_withdraw);
    
    // 计算用户增长率
    const todayUsers = userStats[0].today_users || 0;
    const yesterdayUsers = userStats[0].yesterday_users || 0;
    const userGrowth = yesterdayUsers > 0 
      ? ((todayUsers - yesterdayUsers) / yesterdayUsers * 100).toFixed(1)
      : 0;
    
    // 计算充值增长率
    const todayDeposit = parseFloat(depositStats[0].today_deposit) || 0;
    const yesterdayDeposit = parseFloat(depositStats[0].yesterday_deposit) || 0;
    const depositGrowth = yesterdayDeposit > 0
      ? ((todayDeposit - yesterdayDeposit) / yesterdayDeposit * 100).toFixed(1)
      : 0;
    
    const result = {
      stats: {
        totalUsers: userStats[0].total_users || 0,
        totalDeposit: depositStats[0].total_deposit || 0,
        totalWithdraw: withdrawStats[0].total_withdraw || 0,
        platformBalance: platformBalance.toFixed(4),
        totalRobots: robotStats[0].total_robots || 0,
        totalFollows: followStats[0].total_follows || 0,
        totalReferrals: referralStats[0].total_referrals || 0,
        pendingWithdrawals: pendingWithdrawals[0].pending_withdrawals || 0,
        todayDeposit: todayDeposit.toFixed(4),
        userGrowth: parseFloat(userGrowth),
        depositGrowth: parseFloat(depositGrowth)
      },
      recentDeposits,
      recentWithdrawals,
      charts: chartData
    };
    
    // 缓存5分钟
    cache.set(cacheKey, result, 300000);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Dashboard] 获取统计数据失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

/**
 * 获取图表数据 - 最近7天
 * 
 * @returns {Promise<Object>} 图表数据
 */
async function getChartData() {
  try {
    // 充值趋势 - 最近7天
    const depositTrend = await dbQuery(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as amount
      FROM deposit_records
      WHERE created_at >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    // 用户增长 - 最近7天
    const userTrend = await dbQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM user_balances
      WHERE created_at >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    // 格式化日期
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    return {
      deposits: {
        dates: depositTrend.map(item => formatDate(item.date)),
        values: depositTrend.map(item => parseFloat(item.amount))
      },
      users: {
        dates: userTrend.map(item => formatDate(item.date)),
        values: userTrend.map(item => parseInt(item.count))
      }
    };
  } catch (error) {
    console.error('[Dashboard] 获取图表数据失败:', error.message);
    return {
      deposits: { dates: [], values: [] },
      users: { dates: [], values: [] }
    };
  }
}

export default router;

