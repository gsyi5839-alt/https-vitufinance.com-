/**
 * 管理后台 - 用户管理路由
 * 
 * 功能:
 * - 获取用户列表 (分页)
 * - 获取用户详情
 * - 更新用户余额
 * - 封禁/解封用户
 * 
 * 优化:
 * - 使用索引优化查询
 * - 添加分页
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
 * 获取用户列表
 * GET /api/admin/users
 * 
 * 查询参数:
 * - page: 页码 (默认1)
 * - pageSize: 每页数量 (默认10)
 * - wallet_address: 钱包地址搜索
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, wallet_address } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let whereConditions = [];
    const params = [];
    
    // 钱包地址搜索
    if (wallet_address) {
      whereConditions.push('wallet_address LIKE ?');
      params.push(`%${sanitizeString(wallet_address)}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 并行查询总数和列表
    const [countResult, list] = await Promise.all([
      dbQuery(`SELECT COUNT(*) as total FROM user_balances ${whereClause}`, params),
      dbQuery(
        `SELECT 
          wallet_address, 
          usdt_balance, 
          wld_balance, 
          total_deposit, 
          total_withdraw, 
          created_at, 
          updated_at,
          is_banned,
          banned_at,
          ban_reason,
          banned_by
        FROM user_balances 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [...params, parseInt(pageSize), offset]
      )
    ]);
    
    res.json({
      success: true,
      data: {
        list,
        total: countResult[0]?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('[User] 获取用户列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * 获取用户详情
 * GET /api/admin/users/:wallet_address
 */
router.get('/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();
    
    // 获取用户基本信息
    const user = await dbQuery(
      `SELECT * FROM user_balances WHERE wallet_address = ?`,
      [walletAddr]
    );
    
    if (!user || user.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 并行获取关联数据
    const [deposits, withdrawals, robots, referrals] = await Promise.all([
      // 充值记录
      dbQuery(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
         FROM deposit_records 
         WHERE wallet_address = ? AND status = 'completed'`,
        [walletAddr]
      ),
      
      // 提款记录
      dbQuery(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
         FROM withdraw_records 
         WHERE wallet_address = ? AND status = 'completed'`,
        [walletAddr]
      ),
      
      // 机器人购买
      dbQuery(
        `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total 
         FROM robot_purchases 
         WHERE wallet_address = ? AND status = 'active'`,
        [walletAddr]
      ),
      
      // 推荐关系
      dbQuery(
        `SELECT COUNT(*) as count 
         FROM user_referrals 
         WHERE referrer_address = ?`,
        [walletAddr]
      )
    ]);
    
    res.json({
      success: true,
      data: {
        ...user[0],
        statistics: {
          depositCount: deposits[0].count,
          depositTotal: deposits[0].total,
          withdrawCount: withdrawals[0].count,
          withdrawTotal: withdrawals[0].total,
          robotCount: robots[0].count,
          robotTotal: robots[0].total,
          referralCount: referrals[0].count
        }
      }
    });
  } catch (error) {
    console.error('[User] 获取用户详情失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

/**
 * 更新用户余额
 * PUT /api/admin/users/:wallet_address/balance
 * 
 * Body:
 * - usdt_balance: USDT余额
 * - wld_balance: WLD余额
 * - remark: 操作备注
 * - is_internal_operation: 是否为内部操作
 */
router.put('/:wallet_address/balance', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { usdt_balance, wld_balance, remark, is_internal_operation = false } = req.body;
    const walletAddr = wallet_address.toLowerCase();
    
    // 验证参数
    if (usdt_balance === undefined || wld_balance === undefined || !remark) {
      return res.status(400).json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 获取当前余额
    const currentUser = await dbQuery(
      'SELECT usdt_balance, wld_balance, total_deposit FROM user_balances WHERE wallet_address = ?',
      [walletAddr]
    );
    
    if (!currentUser || currentUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const oldUsdtBalance = parseFloat(currentUser[0].usdt_balance);
    const oldWldBalance = parseFloat(currentUser[0].wld_balance);
    const newUsdtBalance = parseFloat(usdt_balance);
    const newWldBalance = parseFloat(wld_balance);
    
    // 计算变化量
    const usdtDiff = newUsdtBalance - oldUsdtBalance;
    const wldDiff = newWldBalance - oldWldBalance;
    
    // 更新余额
    await dbQuery(
      `UPDATE user_balances 
       SET usdt_balance = ?, wld_balance = ?, updated_at = NOW() 
       WHERE wallet_address = ?`,
      [newUsdtBalance, newWldBalance, walletAddr]
    );
    
    // 记录操作日志
    await dbQuery(
      `INSERT INTO admin_operation_logs 
       (admin_username, operation_type, target_user, details, created_at) 
       VALUES (?, 'update_balance', ?, ?, NOW())`,
      [
        req.adminUser?.username || 'system',
        walletAddr,
        JSON.stringify({
          old_usdt: oldUsdtBalance,
          new_usdt: newUsdtBalance,
          usdt_diff: usdtDiff,
          old_wld: oldWldBalance,
          new_wld: newWldBalance,
          wld_diff: wldDiff,
          remark,
          is_internal_operation
        })
      ]
    );
    
    // 清除相关缓存
    cache.deleteByPrefix('dashboard:');
    cache.deleteByPrefix('users:');
    
    console.log(`[User] 余额更新: ${walletAddr}, USDT: ${oldUsdtBalance} -> ${newUsdtBalance}, WLD: ${oldWldBalance} -> ${newWldBalance}`);
    
    res.json({
      success: true,
      message: '余额更新成功',
      data: {
        usdt_diff: usdtDiff,
        wld_diff: wldDiff
      }
    });
  } catch (error) {
    console.error('[User] 更新用户余额失败:', error.message);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * 封禁用户
 * POST /api/admin/users/:wallet_address/ban
 * 
 * Body:
 * - reason: 封禁原因
 */
router.post('/:wallet_address/ban', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { reason } = req.body;
    const walletAddr = wallet_address.toLowerCase();
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: '请提供封禁原因'
      });
    }
    
    // 更新用户状态
    await dbQuery(
      `UPDATE user_balances 
       SET is_banned = 1, banned_at = NOW(), ban_reason = ?, banned_by = ?, updated_at = NOW() 
       WHERE wallet_address = ?`,
      [sanitizeString(reason), req.adminUser?.username || 'system', walletAddr]
    );
    
    // 记录操作日志
    await dbQuery(
      `INSERT INTO admin_operation_logs 
       (admin_username, operation_type, target_user, details, created_at) 
       VALUES (?, 'ban_user', ?, ?, NOW())`,
      [req.adminUser?.username || 'system', walletAddr, JSON.stringify({ reason })]
    );
    
    // 清除缓存
    cache.deleteByPrefix('users:');
    
    console.log(`[User] 封禁用户: ${walletAddr}, 原因: ${reason}`);
    
    res.json({
      success: true,
      message: '封禁成功'
    });
  } catch (error) {
    console.error('[User] 封禁用户失败:', error.message);
    res.status(500).json({
      success: false,
      message: '封禁失败'
    });
  }
});

/**
 * 解封用户
 * POST /api/admin/users/:wallet_address/unban
 */
router.post('/:wallet_address/unban', async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();
    
    // 更新用户状态
    await dbQuery(
      `UPDATE user_balances 
       SET is_banned = 0, banned_at = NULL, ban_reason = NULL, banned_by = NULL, updated_at = NOW() 
       WHERE wallet_address = ?`,
      [walletAddr]
    );
    
    // 记录操作日志
    await dbQuery(
      `INSERT INTO admin_operation_logs 
       (admin_username, operation_type, target_user, details, created_at) 
       VALUES (?, 'unban_user', ?, ?, NOW())`,
      [req.adminUser?.username || 'system', walletAddr, JSON.stringify({ action: 'unban' })]
    );
    
    // 清除缓存
    cache.deleteByPrefix('users:');
    
    console.log(`[User] 解封用户: ${walletAddr}`);
    
    res.json({
      success: true,
      message: '解封成功'
    });
  } catch (error) {
    console.error('[User] 解封用户失败:', error.message);
    res.status(500).json({
      success: false,
      message: '解封失败'
    });
  }
});

export default router;

