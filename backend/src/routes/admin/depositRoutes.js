/**
 * 管理后台 - 充值记录路由
 * 
 * 功能:
 * - 获取充值记录列表 (分页)
 * - 获取充值统计
 * - 更新充值状态
 * - 手动触发充值扫描
 * 
 * 优化:
 * - 使用索引优化查询
 * - 添加缓存
 * 
 * 创建时间: 2025-12-18
 */
import express from 'express';
import { query as dbQuery } from '../../config/dbOptimized.js';
import cache from '../../config/cache.js';
import { sanitizeString } from '../../security/index.js';

const router = express.Router();

/**
 * 获取充值记录列表
 * GET /api/admin/deposits
 * 
 * 查询参数:
 * - page: 页码
 * - pageSize: 每页数量
 * - wallet_address: 钱包地址搜索
 * - status: 状态筛选
 * - start_date: 开始日期
 * - end_date: 结束日期
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      wallet_address, 
      status, 
      start_date, 
      end_date 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let whereConditions = [];
    const params = [];
    
    if (wallet_address) {
      whereConditions.push('wallet_address LIKE ?');
      params.push(`%${sanitizeString(wallet_address)}%`);
    }
    
    if (status && status !== 'all') {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    if (start_date) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 并行查询总数和列表
    const [countResult, list] = await Promise.all([
      dbQuery(`SELECT COUNT(*) as total FROM deposit_records ${whereClause}`, params),
      dbQuery(
        `SELECT 
          id, wallet_address, amount, token, network, tx_hash, status, 
          created_at, completed_at, remark
        FROM deposit_records 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [...params, parseInt(pageSize), offset]
      )
    ]);
    
    // 计算本页总金额
    const totalAmount = list.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    
    res.json({
      success: true,
      data: {
        list,
        total: countResult[0]?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total_amount: totalAmount.toFixed(4)
      }
    });
  } catch (error) {
    console.error('[Deposit] 获取充值记录失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取充值记录失败'
    });
  }
});

/**
 * 获取充值统计
 * GET /api/admin/deposits/stats
 * 
 * 优化: 添加缓存
 */
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('deposits:stats');
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    // 并行查询所有统计数据
    const [totalStats, todayStats, monthStats] = await Promise.all([
      // 总体统计
      dbQuery(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
          COUNT(DISTINCT wallet_address) as unique_users
        FROM deposit_records
      `),
      
      // 今日统计
      dbQuery(`
        SELECT 
          COUNT(*) as today_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as today_amount
        FROM deposit_records
        WHERE DATE(created_at) = CURDATE()
      `),
      
      // 本月统计
      dbQuery(`
        SELECT 
          COUNT(*) as month_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as month_amount
        FROM deposit_records
        WHERE DATE(created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')
      `)
    ]);
    
    const result = {
      total: {
        count: parseInt(totalStats[0]?.total_count) || 0,
        completed: parseInt(totalStats[0]?.completed_count) || 0,
        pending: parseInt(totalStats[0]?.pending_count) || 0,
        failed: parseInt(totalStats[0]?.failed_count) || 0,
        amount: parseFloat(totalStats[0]?.total_amount) || 0,
        uniqueUsers: parseInt(totalStats[0]?.unique_users) || 0
      },
      today: {
        count: parseInt(todayStats[0]?.today_count) || 0,
        amount: parseFloat(todayStats[0]?.today_amount) || 0
      },
      month: {
        count: parseInt(monthStats[0]?.month_count) || 0,
        amount: parseFloat(monthStats[0]?.month_amount) || 0
      }
    };
    
    // 缓存5分钟
    cache.set(cacheKey, result, 300000);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Deposit] 获取充值统计失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取充值统计失败'
    });
  }
});

/**
 * 更新充值状态
 * PUT /api/admin/deposits/:id/status
 * 
 * Body:
 * - status: 新状态 (pending/completed/failed)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态'
      });
    }
    
    // 获取原始充值记录
    const deposit = await dbQuery('SELECT * FROM deposit_records WHERE id = ?', [id]);
    
    if (!deposit || deposit.length === 0) {
      return res.status(404).json({
        success: false,
        message: '充值记录不存在'
      });
    }
    
    const oldStatus = deposit[0].status;
    const amount = parseFloat(deposit[0].amount);
    const walletAddress = deposit[0].wallet_address;
    
    // 如果从pending/failed改为completed，需要增加用户余额
    if (status === 'completed' && oldStatus !== 'completed') {
      await dbQuery(
        `UPDATE user_balances 
         SET usdt_balance = usdt_balance + ?, total_deposit = total_deposit + ?, updated_at = NOW() 
         WHERE wallet_address = ?`,
        [amount, amount, walletAddress]
      );
      console.log(`[Deposit] 充值确认: ${amount} USDT -> ${walletAddress}`);
    }
    
    // 如果从completed改为failed，需要扣除用户余额
    if (status === 'failed' && oldStatus === 'completed') {
      await dbQuery(
        `UPDATE user_balances 
         SET usdt_balance = usdt_balance - ?, total_deposit = total_deposit - ?, updated_at = NOW() 
         WHERE wallet_address = ?`,
        [amount, amount, walletAddress]
      );
      console.log(`[Deposit] 充值撤销: ${amount} USDT <- ${walletAddress}`);
    }
    
    // 更新充值记录状态
    await dbQuery(
      'UPDATE deposit_records SET status = ?, completed_at = ? WHERE id = ?',
      [status, status === 'completed' ? new Date() : null, id]
    );
    
    // 清除缓存
    cache.deleteByPrefix('deposits:');
    cache.deleteByPrefix('dashboard:');
    
    res.json({
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('[Deposit] 更新充值状态失败:', error.message);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * 手动触发充值扫描
 * POST /api/admin/deposits/trigger-scan
 */
router.post('/trigger-scan', async (req, res) => {
  try {
    console.log('[Admin] 手动触发充值扫描');
    
    // 动态导入 depositMonitorCron
    const { triggerScan } = await import('../../cron/depositMonitorCron.js');
    
    // 触发扫描（异步执行，不阻塞响应）
    triggerScan().catch(err => {
      console.error('[Admin] 手动扫描错误:', err);
    });
    
    res.json({
      success: true,
      message: '充值扫描已触发，正在后台执行'
    });
  } catch (error) {
    console.error('[Admin] 触发充值扫描失败:', error.message);
    res.status(500).json({
      success: false,
      message: '触发扫描失败'
    });
  }
});

export default router;

