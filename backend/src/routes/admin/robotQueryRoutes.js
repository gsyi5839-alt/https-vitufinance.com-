/**
 * Admin Routes - Robot query and statistics
 */
import express from 'express';
import { dbQuery, authMiddleware } from './shared.js';

const router = express.Router();

/**
 * GET /robots
 * Get robot purchase records with pagination and filters
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      wallet_address,
      robot_type,
      status,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];

    if (wallet_address) {
      conditions.push('wallet_address LIKE ?');
      params.push(`%${wallet_address.toLowerCase()}%`);
    }

    if (robot_type) {
      conditions.push('robot_type = ?');
      params.push(robot_type);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSortFields = ['created_at', 'price', 'total_profit', 'end_time'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await dbQuery(
      `SELECT COUNT(*) as total FROM robot_purchases ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const records = await dbQuery(
      `SELECT * FROM robot_purchases ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Failed to get robot records:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get robot records' });
  }
});

/**
 * GET /robots/stats
 * Get robot statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const activeResult = await dbQuery(
      `SELECT COUNT(*) as count, SUM(price) as total_investment
       FROM robot_purchases
       WHERE status = 'active' AND (end_time IS NULL OR end_time > NOW())`
    );

    const expiredResult = await dbQuery(
      `SELECT COUNT(*) as count, SUM(price) as total_investment, SUM(total_profit) as total_profit
       FROM robot_purchases
       WHERE status = 'expired' OR (status = 'active' AND end_time <= NOW())`
    );

    const typeStats = await dbQuery(
      `SELECT
        robot_type,
        COUNT(*) as count,
        SUM(price) as total_investment,
        SUM(total_profit) as total_profit,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
       FROM robot_purchases
       GROUP BY robot_type`
    );

    const todayResult = await dbQuery(
      `SELECT COUNT(*) as count, SUM(price) as amount
       FROM robot_purchases
       WHERE DATE(created_at) = CURDATE()`
    );

    res.json({
      success: true,
      data: {
        active: {
          count: parseInt(activeResult[0]?.count) || 0,
          total_investment: parseFloat(activeResult[0]?.total_investment) || 0
        },
        expired: {
          count: parseInt(expiredResult[0]?.count) || 0,
          total_investment: parseFloat(expiredResult[0]?.total_investment) || 0,
          total_profit: parseFloat(expiredResult[0]?.total_profit) || 0
        },
        today: {
          count: parseInt(todayResult[0]?.count) || 0,
          amount: parseFloat(todayResult[0]?.amount) || 0
        },
        by_type: typeStats.map(t => ({
          type: t.robot_type,
          count: parseInt(t.count) || 0,
          active_count: parseInt(t.active_count) || 0,
          total_investment: parseFloat(t.total_investment) || 0,
          total_profit: parseFloat(t.total_profit) || 0
        }))
      }
    });
  } catch (error) {
    console.error('Failed to get robot stats:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get robot stats' });
  }
});

/**
 * GET /robots/cancelled
 * Get cancelled robots list
 */
router.get('/cancelled', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, wallet_address, robot_type, days = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const conditions = ['rp.status = "cancelled"', 'rp.cancelled_at >= ?'];
    const params = [daysAgo];

    if (wallet_address) {
      conditions.push('rp.wallet_address = ?');
      params.push(wallet_address.toLowerCase());
    }
    if (robot_type) {
      conditions.push('rp.robot_type = ?');
      params.push(robot_type);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await dbQuery(
      `SELECT COUNT(*) as total FROM robot_purchases rp WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const robots = await dbQuery(
      `SELECT rp.* FROM robot_purchases rp WHERE ${whereClause} ORDER BY rp.cancelled_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: robots,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Failed to get cancelled robots:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get cancelled robots' });
  }
});

/**
 * GET /robots/earnings-summary
 * Get robot earnings summary by type
 */
router.get('/earnings-summary', authMiddleware, async (req, res) => {
  try {
    const typeStats = await dbQuery(`
      SELECT
        robot_type,
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(price) as total_investment,
        SUM(total_profit) as total_profit,
        SUM(expected_return) as total_expected_return
      FROM robot_purchases
      GROUP BY robot_type
    `);

    const topUsers = await dbQuery(`
      SELECT
        wallet_address,
        COUNT(*) as robot_count,
        SUM(price) as total_investment,
        SUM(total_profit) as total_profit
      FROM robot_purchases
      GROUP BY wallet_address
      ORDER BY total_investment DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: {
        by_type: typeStats,
        top_users: topUsers.map(u => ({
          wallet_address: u.wallet_address,
          robot_count: u.robot_count,
          total_investment: parseFloat(u.total_investment || 0).toFixed(2),
          total_profit: parseFloat(u.total_profit || 0).toFixed(4)
        }))
      }
    });
  } catch (error) {
    console.error('Failed to get earnings summary:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get earnings summary' });
  }
});

/**
 * GET /robots/user/:wallet_address
 * Get all robots for a specific user
 */
router.get('/user/:wallet_address', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();

    const robots = await dbQuery(
      `SELECT * FROM robot_purchases
       WHERE wallet_address = ?
       ORDER BY created_at DESC`,
      [walletAddr]
    );

    const summary = {
      total_count: robots.length,
      active_count: robots.filter(r => r.status === 'active').length,
      total_investment: robots.reduce((sum, r) => sum + parseFloat(r.price || 0), 0),
      total_profit: robots.reduce((sum, r) => sum + parseFloat(r.total_profit || 0), 0)
    };

    res.json({
      success: true,
      data: robots,
      summary
    });
  } catch (error) {
    console.error('Failed to get user robots:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get user robots' });
  }
});

/**
 * GET /robots/:id
 * Get robot details by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const robots = await dbQuery(
      'SELECT * FROM robot_purchases WHERE id = ?',
      [id]
    );

    if (!robots || robots.length === 0) {
      return res.status(404).json({ success: false, message: 'Robot not found' });
    }

    const robot = robots[0];

    const userBalance = await dbQuery(
      'SELECT * FROM user_balances WHERE wallet_address = ?',
      [robot.wallet_address]
    );

    const referralRewards = await dbQuery(
      `SELECT * FROM referral_rewards
       WHERE source_wallet = ? AND robot_id = ?
       ORDER BY created_at DESC`,
      [robot.wallet_address, robot.id]
    );

    res.json({
      success: true,
      data: {
        robot,
        user_balance: userBalance[0] || null,
        referral_rewards: referralRewards
      }
    });
  } catch (error) {
    console.error('Failed to get robot details:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get robot details' });
  }
});

export default router;
