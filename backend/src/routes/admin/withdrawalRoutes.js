/**
 * Admin Routes - Withdrawal Records Module
 * Handles: Withdrawal list, processing, auto-transfer
 */
import { 
  express, 
  dbQuery, 
  authMiddleware
} from './shared.js';
import withdrawalTransferRoutes from './withdrawalTransferRoutes.js';

const router = express.Router();

// ==================== Withdrawal Records ====================

router.get('/withdrawals/latest-id', authMiddleware, async (req, res) => {
  try {
    const result = await dbQuery('SELECT MAX(id) as lastId FROM withdraw_records');
    res.json({
      success: true,
      data: {
        lastId: result?.lastId || 0
      }
    });
  } catch (error) {
    console.error('获取最后提款ID失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取失败'
    });
  }
});

/**
 * 检查新提款（用于实时通知）
 * GET /api/admin/withdrawals/check-new?last_id=xxx
 */
router.get('/withdrawals/check-new', authMiddleware, async (req, res) => {
  try {
    const { last_id = 0 } = req.query;
    const lastId = parseInt(last_id);
    
    // 查询新提款数量和最新记录（只查询pending状态的）
    const newWithdrawals = await dbQuery(
      `SELECT * FROM withdraw_records WHERE id > ? AND status = 'pending' ORDER BY id DESC`,
      [lastId]
    );
    
    const newCount = newWithdrawals.length;
    const latestWithdraw = newCount > 0 ? newWithdrawals[0] : null;
    const maxId = newCount > 0 ? newWithdrawals[0].id : lastId;
    
    res.json({
      success: true,
      data: {
        newCount,
        lastId: maxId,
        latestWithdraw
      }
    });
  } catch (error) {
    console.error('检查新提款失败:', error.message);
    res.status(500).json({
      success: false,
      message: '检查失败'
    });
  }
});

/**
 * 获取提款记录列表
 * GET /api/admin/withdrawals
 */
router.get('/withdrawals', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, wallet_address, status, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let whereConditions = [];
    const params = [];
    
    if (wallet_address) {
      whereConditions.push('wallet_address LIKE ?');
      params.push(`%${wallet_address}%`);
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
    
    // 获取总数
    const countResult = await dbQuery(
      `SELECT COUNT(*) as total FROM withdraw_records ${whereClause}`,
      params
    );
    
    // 获取列表
    const list = await dbQuery(
      `SELECT * FROM withdraw_records ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );
    
    res.json({
      success: true,
      data: {
        list,
        total: countResult?.[0]?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取提款记录失败:', error.message);
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
router.get('/withdrawals/stats', authMiddleware, async (req, res) => {
  try {
    // 获取总体统计
    const totalStats = await dbQuery(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN amount ELSE 0 END) as pending_amount,
        COUNT(DISTINCT wallet_address) as unique_users
      FROM withdraw_records
    `);
    
    // 今日统计
    const todayStats = await dbQuery(`
      SELECT 
        COUNT(*) as today_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as today_amount,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as today_pending_count
      FROM withdraw_records
      WHERE DATE(created_at) = CURDATE()
    `);
    
    // 本月统计
    const monthStats = await dbQuery(`
      SELECT 
        COUNT(*) as month_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as month_amount
      FROM withdraw_records
      WHERE DATE(created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')
    `);
    
    res.json({
      success: true,
      data: {
        total: {
          count: parseInt(totalStats[0]?.total_count) || 0,
          completed: parseInt(totalStats[0]?.completed_count) || 0,
          pending: parseInt(totalStats[0]?.pending_count) || 0,
          processing: parseInt(totalStats[0]?.processing_count) || 0,
          rejected: parseInt(totalStats[0]?.rejected_count) || 0,
          amount: parseFloat(totalStats[0]?.total_amount) || 0,
          pendingAmount: parseFloat(totalStats[0]?.pending_amount) || 0,
          uniqueUsers: parseInt(totalStats[0]?.unique_users) || 0
        },
        today: {
          count: parseInt(todayStats[0]?.today_count) || 0,
          amount: parseFloat(todayStats[0]?.today_amount) || 0,
          pendingCount: parseInt(todayStats[0]?.today_pending_count) || 0
        },
        month: {
          count: parseInt(monthStats[0]?.month_count) || 0,
          amount: parseFloat(monthStats[0]?.month_amount) || 0
        }
      }
    });
  } catch (error) {
    console.error('获取提款统计失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取提款统计失败'
    });
  }
});

/**
 * 处理提款请求
 * PUT /api/admin/withdrawals/:id/process
 */
router.put('/withdrawals/:id/process', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tx_hash, action } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态'
      });
    }

    // 获取原始提款记录
    const withdrawalResult = await dbQuery('SELECT * FROM withdraw_records WHERE id = ?', [id]);
    const withdrawal = withdrawalResult[0];

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: '提款记录不存在'
      });
    }

    // 如果是拒绝或失败，需要退回余额（只有从非失败状态变为失败时才退回）
    if ((status === 'failed' || action === 'reject') && withdrawal.status !== 'failed' && withdrawal.status !== 'completed') {
      await dbQuery(
        'UPDATE user_balances SET usdt_balance = usdt_balance + ?, total_withdraw = total_withdraw - ? WHERE wallet_address = ?',
        [withdrawal.amount, withdrawal.amount, withdrawal.wallet_address]
      );
      console.log(`[Withdraw] 退回余额: ${withdrawal.amount} USDT -> ${withdrawal.wallet_address}`);
    }

    // 如果从失败状态重新处理（改回pending），需要再次扣除余额
    if (status === 'pending' && withdrawal.status === 'failed') {
      // 检查余额是否足够
      const balanceResult = await dbQuery(
        'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
        [withdrawal.wallet_address]
      );
      const balance = balanceResult[0];

      const userBalance = parseFloat(balance?.usdt_balance) || 0;
      if (userBalance < parseFloat(withdrawal.amount)) {
        return res.status(400).json({
          success: false,
          message: `用户余额不足，当前余额: ${userBalance.toFixed(4)} USDT`
        });
      }

      await dbQuery(
        'UPDATE user_balances SET usdt_balance = usdt_balance - ?, total_withdraw = total_withdraw + ? WHERE wallet_address = ?',
        [withdrawal.amount, withdrawal.amount, withdrawal.wallet_address]
      );
      console.log(`[Withdraw] 重新扣除余额: ${withdrawal.amount} USDT <- ${withdrawal.wallet_address}`);
    }

    // 更新提款状态
    const updateParams = [status];
    let updateSql = 'UPDATE withdraw_records SET status = ?';

    if (tx_hash) {
      updateSql += ', tx_hash = ?';
      updateParams.push(tx_hash);
    }

    if (status === 'completed') {
      updateSql += ', completed_at = NOW()';
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(id);

    await dbQuery(updateSql, updateParams);

    res.json({
      success: true,
      message: '处理成功'
    });
  } catch (error) {
    console.error('处理提款失败:', error.message);
    res.status(500).json({
      success: false,
      message: '处理失败'
    });
  }
});

router.use(withdrawalTransferRoutes);

export default router;
