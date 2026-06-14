/**
 * Admin Routes - User Management Module
 * Handles: User list, balance adjustment, diagnostics, ban/unban
 */
import { 
  express, 
  dbQuery, 
  authMiddleware
} from './shared.js';
import userBalanceDetailRoutes from './userBalanceDetailRoutes.js';
import userBanRoutes from './userBanRoutes.js';

const router = express.Router();

// ==================== User Management ====================

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, wallet_address } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let whereClause = '';
    const params = [];
    
    if (wallet_address) {
      whereClause = 'WHERE wallet_address LIKE ?';
      params.push(`%${wallet_address}%`);
    }
    
    // 获取总数
    const countResult = await dbQuery(
      `SELECT COUNT(*) as total FROM user_balances ${whereClause}`,
      params
    );
    
    // 获取列表
    const list = await dbQuery(
      `SELECT * FROM user_balances ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
    console.error('获取用户列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * 更新用户余额
 * PUT /api/admin/users/:wallet_address/balance
 */
router.put('/users/:wallet_address/balance', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { usdt_balance, wld_balance, remark, is_internal_operation } = req.body;
    const admin_username = req.admin?.username || 'unknown';
    const admin_id = req.admin?.id || 0;
    
    if (usdt_balance === undefined && wld_balance === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的余额'
      });
    }
    
    const walletAddr = wallet_address.toLowerCase();
    
    // Get current balance for comparison and logging
    const currentBalanceResult = await dbQuery(
      'SELECT usdt_balance, wld_balance, manual_added_balance FROM user_balances WHERE wallet_address = ?',
      [walletAddr]
    );
    
    if (!currentBalanceResult || currentBalanceResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const currentBalance = currentBalanceResult[0];
    const oldUsdt = parseFloat(currentBalance.usdt_balance) || 0;
    const oldWld = parseFloat(currentBalance.wld_balance) || 0;
    const newUsdt = usdt_balance !== undefined ? parseFloat(usdt_balance) : oldUsdt;
    const newWld = wld_balance !== undefined ? parseFloat(wld_balance) : oldWld;
    
    // Build update query
    const updateFields = [];
    const updateParams = [];
    
    // If internal operation, track manual_added_balance
    if (is_internal_operation === true) {
      if (usdt_balance !== undefined) {
        const diff = newUsdt - oldUsdt;
        
        if (diff > 0) {
          // Increasing balance, record to manual_added_balance
          updateFields.push('usdt_balance = ?');
          updateParams.push(newUsdt);
          updateFields.push('manual_added_balance = manual_added_balance + ?');
          updateParams.push(diff);
        } else {
          // Decreasing balance, don't record to manual_added_balance
          updateFields.push('usdt_balance = ?');
          updateParams.push(newUsdt);
        }
      }
      
      if (wld_balance !== undefined) {
        updateFields.push('wld_balance = ?');
        updateParams.push(newWld);
      }
    } else {
      // Normal update operation
      if (usdt_balance !== undefined) {
        updateFields.push('usdt_balance = ?');
        updateParams.push(newUsdt);
      }
      
      if (wld_balance !== undefined) {
        updateFields.push('wld_balance = ?');
        updateParams.push(newWld);
      }
    }
    
    updateFields.push('updated_at = NOW()');
    updateParams.push(walletAddr);
    
    // Execute update
    await dbQuery(
      `UPDATE user_balances SET ${updateFields.join(', ')} WHERE wallet_address = ?`,
      updateParams
    );
    
    // Build detailed operation log
    const operationDetail = JSON.stringify({
      wallet_address: walletAddr,
      before: { usdt: oldUsdt.toFixed(4), wld: oldWld.toFixed(4) },
      after: { usdt: newUsdt.toFixed(4), wld: newWld.toFixed(4) },
      change: { 
        usdt: (newUsdt - oldUsdt).toFixed(4), 
        wld: (newWld - oldWld).toFixed(4) 
      },
      is_internal_operation: is_internal_operation || false,
      remark: remark || ''
    });
    
    // Record to admin_operation_logs table
    await dbQuery(
      `INSERT INTO admin_operation_logs 
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at) 
       VALUES (?, ?, 'balance_update', ?, ?, ?, NOW())`,
      [
        admin_id,
        admin_username,
        walletAddr,
        operationDetail,
        req.ip || req.connection?.remoteAddress || 'unknown'
      ]
    );
    
    console.log(`[Admin] 余额更新: admin=${admin_username}, wallet=${walletAddr}, USDT: ${oldUsdt} -> ${newUsdt}, WLD: ${oldWld} -> ${newWld}, 备注: ${remark}`);
    
    res.json({
      success: true,
      message: '余额更新成功',
      data: {
        before: { usdt: oldUsdt.toFixed(4), wld: oldWld.toFixed(4) },
        after: { usdt: newUsdt.toFixed(4), wld: newWld.toFixed(4) }
      }
    });
  } catch (error) {
    console.error('更新用户余额失败:', error.message);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

router.use(userBalanceDetailRoutes);
router.use(userBanRoutes);

export default router;
