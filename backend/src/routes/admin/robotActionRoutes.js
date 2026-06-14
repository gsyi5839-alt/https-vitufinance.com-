/**
 * Admin Routes - Robot status actions
 */
import express from 'express';
import { dbQuery, secureLog, authMiddleware } from './shared.js';

const router = express.Router();

function calculateRefundAmount(robot, shouldRefund) {
  if (!shouldRefund) {
    return 0;
  }

  if (robot.robot_type === 'high' || robot.robot_type === 'dex') {
    return parseFloat(robot.expected_return) || parseFloat(robot.price);
  }

  return parseFloat(robot.price);
}

/**
 * POST /robots/batch-cancel
 * Batch cancel multiple robots
 */
router.post('/batch-cancel', authMiddleware, async (req, res) => {
  try {
    const { ids, refund = false, reason = 'Batch admin cancellation' } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No robot IDs provided' });
    }

    let cancelled = 0;
    let skipped = 0;
    let totalRefund = 0;
    const results = [];

    for (const id of ids) {
      try {
        const robots = await dbQuery('SELECT * FROM robot_purchases WHERE id = ?', [id]);

        if (!robots || robots.length === 0) {
          skipped++;
          results.push({ id, status: 'not_found' });
          continue;
        }

        const robot = robots[0];
        if (robot.status !== 'active') {
          skipped++;
          results.push({ id, status: 'already_' + robot.status });
          continue;
        }

        const refundAmount = calculateRefundAmount(robot, refund);

        await dbQuery(
          `UPDATE robot_purchases SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [id]
        );

        if (refund && refundAmount > 0) {
          await dbQuery(
            `UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?`,
            [refundAmount, robot.wallet_address]
          );
          totalRefund += refundAmount;
        }

        cancelled++;
        results.push({ id, wallet: robot.wallet_address, status: 'cancelled', refund: refundAmount });
      } catch (err) {
        skipped++;
        results.push({ id, status: 'error', error: err.message });
      }
    }

    await dbQuery(
      `INSERT INTO admin_operation_logs
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
       VALUES (?, ?, 'BATCH_CANCEL_ROBOTS', 'batch', ?, ?, NOW())`,
      [req.admin?.id || 0, adminUsername, JSON.stringify({ count: cancelled, refund, total_refund: totalRefund, reason }), req.ip]
    );

    res.json({
      success: true,
      message: `Cancelled ${cancelled} robots, skipped ${skipped}`,
      data: { cancelled, skipped, total_refund: totalRefund, results: results.slice(0, 50) }
    });
  } catch (error) {
    console.error('Failed to batch cancel robots:', error.message);
    res.status(500).json({ success: false, message: 'Failed to batch cancel robots' });
  }
});

/**
 * POST /robots/cancel-by-user/:wallet_address
 * Cancel all active robots for a user
 */
router.post('/cancel-by-user/:wallet_address', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { refund = false, reason = 'Admin cancellation - all user robots' } = req.body;
    const walletAddr = wallet_address.toLowerCase();
    const adminUsername = req.admin?.username || 'admin';

    const activeRobots = await dbQuery(
      'SELECT * FROM robot_purchases WHERE wallet_address = ? AND status = "active"',
      [walletAddr]
    );

    if (!activeRobots || activeRobots.length === 0) {
      return res.status(404).json({ success: false, message: 'No active robots found for this user' });
    }

    let totalRefund = 0;
    const robotIds = [];

    for (const robot of activeRobots) {
      const refundAmount = calculateRefundAmount(robot, refund);
      totalRefund += refundAmount;
      robotIds.push(robot.id);
    }

    await dbQuery(
      `UPDATE robot_purchases SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE wallet_address = ? AND status = 'active'`,
      [walletAddr]
    );

    if (refund && totalRefund > 0) {
      await dbQuery(
        `UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?`,
        [totalRefund, walletAddr]
      );

      await dbQuery(
        `INSERT INTO transaction_history
         (wallet_address, type, amount, token, description, status, created_at)
         VALUES (?, 'robot_batch_cancel_refund', ?, 'USDT', ?, 'completed', NOW())`,
        [walletAddr, totalRefund, `Admin cancelled ${activeRobots.length} robots, total refund`]
      );
    }

    await dbQuery(
      `INSERT INTO admin_operation_logs
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
       VALUES (?, ?, 'CANCEL_USER_ROBOTS', ?, ?, ?, NOW())`,
      [req.admin?.id || 0, adminUsername, walletAddr, JSON.stringify({ robot_count: activeRobots.length, robot_ids: robotIds, refund, total_refund: totalRefund, reason }), req.ip]
    );

    res.json({
      success: true,
      message: `Cancelled ${activeRobots.length} robots${refund ? `, refunded ${totalRefund} USDT` : ''}`,
      data: { wallet_address: walletAddr, robots_cancelled: activeRobots.length, total_refund: totalRefund }
    });
  } catch (error) {
    console.error('Failed to cancel user robots:', error.message);
    res.status(500).json({ success: false, message: 'Failed to cancel user robots: ' + error.message });
  }
});

/**
 * POST /robots/:id/cancel
 * Cancel a robot
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { refund = false, reason = 'Admin cancellation' } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    const robots = await dbQuery('SELECT * FROM robot_purchases WHERE id = ?', [id]);

    if (!robots || robots.length === 0) {
      return res.status(404).json({ success: false, message: 'Robot not found' });
    }

    const robot = robots[0];

    if (robot.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Robot is already ${robot.status}`
      });
    }

    const refundAmount = calculateRefundAmount(robot, refund);

    await dbQuery(
      `UPDATE robot_purchases
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    if (refund && refundAmount > 0) {
      await dbQuery(
        `UPDATE user_balances
         SET usdt_balance = usdt_balance + ?, updated_at = NOW()
         WHERE wallet_address = ?`,
        [refundAmount, robot.wallet_address]
      );

      await dbQuery(
        `INSERT INTO transaction_history
         (wallet_address, type, amount, token, description, status, created_at)
         VALUES (?, 'robot_cancel_refund', ?, 'USDT', ?, 'completed', NOW())`,
        [robot.wallet_address, refundAmount, `Admin cancelled robot #${id}, refund`]
      );
    }

    await dbQuery(
      `INSERT INTO admin_operation_logs
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
       VALUES (?, ?, 'CANCEL_ROBOT', ?, ?, ?, NOW())`,
      [
        req.admin?.id || 0,
        adminUsername,
        robot.wallet_address,
        JSON.stringify({ robot_id: id, robot_type: robot.robot_type, refund, refund_amount: refundAmount, reason }),
        req.ip
      ]
    );

    secureLog('info', `Robot #${id} cancelled by ${adminUsername}`, {
      wallet: robot.wallet_address,
      refund: refund,
      refund_amount: refundAmount
    });

    res.json({
      success: true,
      message: `Robot cancelled${refund ? `, refunded ${refundAmount} USDT` : ''}`,
      data: { robot_id: id, refund, refund_amount: refundAmount }
    });
  } catch (error) {
    console.error('Failed to cancel robot:', error.message);
    res.status(500).json({ success: false, message: 'Failed to cancel robot: ' + error.message });
  }
});

/**
 * POST /robots/:id/reactivate
 * Reactivate a cancelled robot
 */
router.post('/:id/reactivate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { extend_days = 0 } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    const robots = await dbQuery('SELECT * FROM robot_purchases WHERE id = ?', [id]);

    if (!robots || robots.length === 0) {
      return res.status(404).json({ success: false, message: 'Robot not found' });
    }

    const robot = robots[0];
    if (robot.status === 'active') {
      return res.status(400).json({ success: false, message: 'Robot is already active' });
    }

    let newEndTime = new Date();
    if (extend_days > 0) {
      newEndTime = new Date(Date.now() + extend_days * 24 * 60 * 60 * 1000);
    } else if (robot.end_time) {
      const originalEnd = new Date(robot.end_time);
      const now = new Date();
      if (originalEnd > now) {
        newEndTime = originalEnd;
      } else {
        const originalDuration = robot.duration_hours || 24;
        newEndTime = new Date(Date.now() + originalDuration * 60 * 60 * 1000);
      }
    }

    await dbQuery(
      `UPDATE robot_purchases SET status = 'active', cancelled_at = NULL, end_time = ?, updated_at = NOW() WHERE id = ?`,
      [newEndTime, id]
    );

    await dbQuery(
      `INSERT INTO admin_operation_logs
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
       VALUES (?, ?, 'REACTIVATE_ROBOT', ?, ?, ?, NOW())`,
      [req.admin?.id || 0, adminUsername, robot.wallet_address, JSON.stringify({ robot_id: id, previous_status: robot.status, new_end_time: newEndTime.toISOString(), extend_days }), req.ip]
    );

    res.json({
      success: true,
      message: 'Robot reactivated successfully',
      data: { robot_id: id, new_end_time: newEndTime.toISOString() }
    });
  } catch (error) {
    console.error('Failed to reactivate robot:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reactivate robot: ' + error.message });
  }
});

export default router;
