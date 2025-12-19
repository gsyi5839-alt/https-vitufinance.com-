/**
 * 管理后台 - 提款记录路由
 * 
 * 功能:
 * - 获取提款记录列表 (分页)
 * - 获取提款统计
 * - 处理提款请求
 * - 自动转账
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
import { transferUSDT } from '../../utils/bscTransferService.js';

const router = express.Router();

/**
 * 获取提款记录列表
 * GET /api/admin/withdrawals
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
    
    if (status) {
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
      dbQuery(`SELECT COUNT(*) as total FROM withdraw_records ${whereClause}`, params),
      dbQuery(
        `SELECT 
          id, wallet_address, amount, token, network, status, 
          tx_hash, created_at, processed_at, remark
        FROM withdraw_records 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [...params, parseInt(pageSize), offset]
      )
    ]);
    
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
    console.error('[Withdrawal] 获取提款记录失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取提款记录失败'
    });
  }
});

/**
 * 获取提款统计
 * GET /api/admin/withdrawals/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = cache.generateKey('withdrawals:stats');
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    const [totalStats, todayStats] = await Promise.all([
      dbQuery(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
        FROM withdraw_records
      `),
      
      dbQuery(`
        SELECT 
          COUNT(*) as today_count,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as today_amount
        FROM withdraw_records
        WHERE DATE(created_at) = CURDATE()
      `)
    ]);
    
    const result = {
      total: {
        count: parseInt(totalStats[0]?.total_count) || 0,
        completed: parseInt(totalStats[0]?.completed_count) || 0,
        pending: parseInt(totalStats[0]?.pending_count) || 0,
        processing: parseInt(totalStats[0]?.processing_count) || 0,
        failed: parseInt(totalStats[0]?.failed_count) || 0,
        amount: parseFloat(totalStats[0]?.total_amount) || 0
      },
      today: {
        count: parseInt(todayStats[0]?.today_count) || 0,
        amount: parseFloat(todayStats[0]?.today_amount) || 0
      }
    };
    
    cache.set(cacheKey, result, 300000);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Withdrawal] 获取提款统计失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取提款统计失败'
    });
  }
});

/**
 * 处理提款请求
 * PUT /api/admin/withdrawals/:id/process
 * 
 * Body:
 * - action: 'approve' | 'reject'
 * - tx_hash: 交易哈希 (approve时必填)
 * - remark: 备注
 */
router.put('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, tx_hash, remark } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }
    
    // 获取提款记录
    const withdrawal = await dbQuery('SELECT * FROM withdraw_records WHERE id = ?', [id]);
    
    if (!withdrawal || withdrawal.length === 0) {
      return res.status(404).json({
        success: false,
        message: '提款记录不存在'
      });
    }
    
    if (withdrawal[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该提款记录已处理'
      });
    }
    
    const amount = parseFloat(withdrawal[0].amount);
    const walletAddress = withdrawal[0].wallet_address;
    
    if (action === 'approve') {
      if (!tx_hash) {
        return res.status(400).json({
          success: false,
          message: '请提供交易哈希'
        });
      }
      
      // 更新提款记录为已完成
      await dbQuery(
        `UPDATE withdraw_records 
         SET status = 'completed', tx_hash = ?, processed_at = NOW(), remark = ? 
         WHERE id = ?`,
        [tx_hash, remark || '管理员审批通过', id]
      );
      
      console.log(`[Withdrawal] 提款审批通过: ${amount} USDT -> ${walletAddress}, TX: ${tx_hash}`);
    } else {
      // 拒绝提款，退回余额
      await dbQuery(
        `UPDATE user_balances 
         SET usdt_balance = usdt_balance + ?, updated_at = NOW() 
         WHERE wallet_address = ?`,
        [amount, walletAddress]
      );
      
      await dbQuery(
        `UPDATE withdraw_records 
         SET status = 'failed', processed_at = NOW(), remark = ? 
         WHERE id = ?`,
        [remark || '管理员拒绝', id]
      );
      
      console.log(`[Withdrawal] 提款拒绝: ${amount} USDT 退回 ${walletAddress}`);
    }
    
    // 清除缓存
    cache.deleteByPrefix('withdrawals:');
    cache.deleteByPrefix('dashboard:');
    
    res.json({
      success: true,
      message: action === 'approve' ? '审批成功' : '已拒绝'
    });
  } catch (error) {
    console.error('[Withdrawal] 处理提款失败:', error.message);
    res.status(500).json({
      success: false,
      message: '处理失败'
    });
  }
});

/**
 * 自动转账
 * POST /api/admin/withdrawals/:id/auto-transfer
 * 
 * Body:
 * - private_key: 私钥 (可选,使用环境变量)
 */
router.post('/:id/auto-transfer', async (req, res) => {
  try {
    const { id } = req.params;
    const { private_key } = req.body;
    
    // 获取提款记录
    const withdrawal = await dbQuery('SELECT * FROM withdraw_records WHERE id = ?', [id]);
    
    if (!withdrawal || withdrawal.length === 0) {
      return res.status(404).json({
        success: false,
        message: '提款记录不存在'
      });
    }
    
    if (withdrawal[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该提款记录已处理'
      });
    }
    
    const amount = parseFloat(withdrawal[0].amount);
    const toAddress = withdrawal[0].wallet_address;
    
    // 更新状态为处理中
    await dbQuery(
      'UPDATE withdraw_records SET status = ?, remark = ? WHERE id = ?',
      ['processing', '自动转账中...', id]
    );
    
    try {
      // 执行转账
      const txHash = await transferUSDT(toAddress, amount, private_key);
      
      // 更新为已完成
      await dbQuery(
        `UPDATE withdraw_records 
         SET status = 'completed', tx_hash = ?, processed_at = NOW(), remark = ? 
         WHERE id = ?`,
        [txHash, '自动转账成功', id]
      );
      
      console.log(`[Withdrawal] 自动转账成功: ${amount} USDT -> ${toAddress}, TX: ${txHash}`);
      
      // 清除缓存
      cache.deleteByPrefix('withdrawals:');
      cache.deleteByPrefix('dashboard:');
      
      res.json({
        success: true,
        message: '转账成功',
        data: { tx_hash: txHash }
      });
    } catch (transferError) {
      // 转账失败，退回余额
      await dbQuery(
        `UPDATE user_balances 
         SET usdt_balance = usdt_balance + ?, updated_at = NOW() 
         WHERE wallet_address = ?`,
        [amount, toAddress]
      );
      
      await dbQuery(
        `UPDATE withdraw_records 
         SET status = 'failed', remark = ? 
         WHERE id = ?`,
        [`转账失败: ${transferError.message}`, id]
      );
      
      throw transferError;
    }
  } catch (error) {
    console.error('[Withdrawal] 自动转账失败:', error.message);
    res.status(500).json({
      success: false,
      message: `转账失败: ${error.message}`
    });
  }
});

/**
 * 检查新提款
 * GET /api/admin/withdrawals/check-new
 */
router.get('/check-new', async (req, res) => {
  try {
    const { last_id = 0 } = req.query;
    const lastId = parseInt(last_id);
    
    const newWithdrawals = await dbQuery(
      `SELECT * FROM withdraw_records 
       WHERE id > ? AND status = 'pending' 
       ORDER BY id DESC`,
      [lastId]
    );
    
    const newCount = newWithdrawals.length;
    const maxId = newCount > 0 ? newWithdrawals[0].id : lastId;
    
    res.json({
      success: true,
      data: {
        newCount,
        lastId: maxId,
        latestWithdraw: newCount > 0 ? newWithdrawals[0] : null
      }
    });
  } catch (error) {
    console.error('[Withdrawal] 检查新提款失败:', error.message);
    res.status(500).json({
      success: false,
      message: '检查失败'
    });
  }
});

export default router;

