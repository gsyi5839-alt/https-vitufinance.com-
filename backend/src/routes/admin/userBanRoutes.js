import { express, dbQuery, authMiddleware } from './shared.js';

const router = express.Router();

router.post('/users/:wallet_address/ban', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { reason } = req.body;
    const admin_username = req.admin.username;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请提供封禁原因'
      });
    }

    const walletAddr = wallet_address.toLowerCase();
    const userRows = await dbQuery(
      'SELECT wallet_address, is_banned FROM user_balances WHERE wallet_address = ?',
      [walletAddr]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (Number(userRows[0].is_banned) === 1) {
      return res.status(400).json({
        success: false,
        message: '该用户已被封禁'
      });
    }

    await dbQuery(
      `UPDATE user_balances
       SET is_banned = 1,
           banned_at = NOW(),
           ban_reason = ?,
           banned_by = ?,
           updated_at = NOW()
       WHERE wallet_address = ?`,
      [reason, admin_username, walletAddr]
    );

    console.log(`[Admin Ban] 用户已被封禁: ${walletAddr}, 原因: ${reason}, 操作员: ${admin_username}`);
    res.json({ success: true, message: '用户已成功封禁' });
  } catch (error) {
    console.error('封禁用户失败:', error.message);
    res.status(500).json({
      success: false,
      message: '封禁操作失败'
    });
  }
});

router.post('/users/:wallet_address/unban', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const admin_username = req.admin.username;
    const walletAddr = wallet_address.toLowerCase();

    const userRows = await dbQuery(
      'SELECT wallet_address, is_banned FROM user_balances WHERE wallet_address = ?',
      [walletAddr]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (Number(userRows[0].is_banned) === 0) {
      return res.status(400).json({
        success: false,
        message: '该用户未被封禁'
      });
    }

    await dbQuery(
      `UPDATE user_balances
       SET is_banned = 0,
           banned_at = NULL,
           ban_reason = NULL,
           banned_by = NULL,
           updated_at = NOW()
       WHERE wallet_address = ?`,
      [walletAddr]
    );

    console.log(`[Admin Unban] 用户已解封: ${walletAddr}, 操作员: ${admin_username}`);
    res.json({ success: true, message: '用户已成功解封' });
  } catch (error) {
    console.error('解封用户失败:', error.message);
    res.status(500).json({
      success: false,
      message: '解封操作失败'
    });
  }
});

export default router;
