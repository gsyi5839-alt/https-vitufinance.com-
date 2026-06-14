/**
 * Admin Routes - Team Management Module
 * Handles: User team data, hierarchy, award referral/dividend, broker level
 */
import { express, dbQuery, authMiddleware } from './shared.js';
import teamManagementActionRoutes from './teamManagementActionRoutes.js';

const router = express.Router();

// ==================== Team Management ====================

router.get('/team-management/user/:wallet_address', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();

    // Get user basic info
    const userRows = await dbQuery(
      `SELECT ub.*, 
        (SELECT COUNT(*) FROM user_referrals WHERE referrer_address = ub.wallet_address) as direct_referrals,
        (SELECT referrer_address FROM user_referrals WHERE wallet_address = ub.wallet_address) as my_referrer
       FROM user_balances ub
       WHERE ub.wallet_address = ?`,
      [walletAddr]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRows[0];

    // Get team statistics
    const teamStats = await dbQuery(`
      WITH RECURSIVE team_tree AS (
        SELECT wallet_address, referrer_address, 1 as level
        FROM user_referrals WHERE referrer_address = ?
        UNION ALL
        SELECT r.wallet_address, r.referrer_address, t.level + 1
        FROM user_referrals r
        INNER JOIN team_tree t ON r.referrer_address = t.wallet_address
        WHERE t.level < 8
      )
      SELECT 
        COUNT(DISTINCT tt.wallet_address) as total_team_members,
        COALESCE(SUM(CASE WHEN tt.level = 1 THEN 1 ELSE 0 END), 0) as level1_count,
        COALESCE(SUM(CASE WHEN tt.level = 2 THEN 1 ELSE 0 END), 0) as level2_count,
        COALESCE(SUM(CASE WHEN tt.level = 3 THEN 1 ELSE 0 END), 0) as level3_count,
        COALESCE(SUM(CASE WHEN tt.level <= 8 THEN 1 ELSE 0 END), 0) as total_count
      FROM team_tree tt
    `, [walletAddr]);

    // Get team performance (total deposits) - downline only, excluding self
    const performanceRows = await dbQuery(`
      WITH RECURSIVE team_tree AS (
        SELECT wallet_address FROM user_referrals WHERE referrer_address = ?
        UNION ALL
        SELECT r.wallet_address FROM user_referrals r
        INNER JOIN team_tree t ON r.referrer_address = t.wallet_address
      )
      SELECT COALESCE(SUM(d.amount), 0) as total_team_deposits
      FROM deposit_records d
      WHERE d.wallet_address IN (SELECT wallet_address FROM team_tree)
        AND d.status = 'completed'
    `, [walletAddr]);

    // Get referral rewards history
    const referralRewards = await dbQuery(`
      SELECT COALESCE(SUM(reward_amount), 0) as total_referral_reward
      FROM referral_rewards
      WHERE to_wallet = ?
    `, [walletAddr]);

    // Get team dividend history
    const teamDividends = await dbQuery(`
      SELECT COALESCE(SUM(reward_amount), 0) as total_team_dividend
      FROM team_dividend_records
      WHERE wallet_address = ?
    `, [walletAddr]);

    // Get broker level info
    const brokerInfo = await dbQuery(`
      SELECT broker_level, qualified_direct_members, team_performance
      FROM broker_levels
      WHERE wallet_address = ?
    `, [walletAddr]);

    res.json({
      success: true,
      data: {
        wallet_address: walletAddr,
        usdt_balance: parseFloat(user.usdt_balance || 0),
        total_deposit: parseFloat(user.total_deposit || 0),
        my_referrer: user.my_referrer || null,
        direct_referrals: user.direct_referrals || 0,
        broker_level: brokerInfo[0]?.broker_level || 0,
        qualified_direct_members: brokerInfo[0]?.qualified_direct_members || 0,
        team_performance: parseFloat(brokerInfo[0]?.team_performance || performanceRows[0]?.total_team_deposits || 0),
        total_team_members: teamStats[0]?.total_team_members || 0,
        level_breakdown: {
          level1: teamStats[0]?.level1_count || 0,
          level2: teamStats[0]?.level2_count || 0,
          level3: teamStats[0]?.level3_count || 0
        },
        total_referral_reward: parseFloat(referralRewards[0]?.total_referral_reward || 0),
        total_team_dividend: parseFloat(teamDividends[0]?.total_team_dividend || 0),
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[TeamManagement] Error getting user data:', error);
    res.status(500).json({ success: false, message: 'Failed to get user data' });
  }
});

/**
 * GET /api/admin/team-management/hierarchy/:wallet_address
 * Get multi-level referral hierarchy tree
 */
router.get('/team-management/hierarchy/:wallet_address', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const { max_level = 3 } = req.query;
    const walletAddr = wallet_address.toLowerCase();
    const maxLvl = Math.min(parseInt(max_level) || 3, 8);

    // Build hierarchy tree recursively
    const buildTree = async (address, level) => {
      if (level > maxLvl) return [];
      
      const children = await dbQuery(`
        SELECT 
          r.wallet_address,
          r.created_at as bind_time,
          COALESCE(ub.usdt_balance, 0) as balance,
          COALESCE(ub.total_deposit, 0) as total_deposit,
          (SELECT COUNT(*) FROM user_referrals WHERE referrer_address = r.wallet_address) as sub_count,
          (SELECT COUNT(*) FROM robot_purchases WHERE wallet_address = r.wallet_address AND status = 'active') as active_robots,
          COALESCE(bl.broker_level, 0) as broker_level
        FROM user_referrals r
        LEFT JOIN user_balances ub ON ub.wallet_address = r.wallet_address
        LEFT JOIN broker_levels bl ON bl.wallet_address = r.wallet_address
        WHERE r.referrer_address = ?
        ORDER BY r.created_at DESC
        LIMIT 100
      `, [address]);

      const result = [];
      for (const child of children) {
        const node = {
          wallet_address: child.wallet_address,
          bind_time: child.bind_time,
          balance: parseFloat(child.balance || 0),
          total_deposit: parseFloat(child.total_deposit || 0),
          sub_count: child.sub_count || 0,
          active_robots: child.active_robots || 0,
          broker_level: child.broker_level || 0,
          level: level,
          children: level < maxLvl ? await buildTree(child.wallet_address, level + 1) : []
        };
        result.push(node);
      }
      return result;
    };

    const hierarchy = await buildTree(walletAddr, 1);

    // Count totals
    const countNodes = (nodes) => {
      let count = nodes.length;
      for (const node of nodes) {
        if (node.children) count += countNodes(node.children);
      }
      return count;
    };

    res.json({
      success: true,
      data: {
        root: walletAddr,
        max_level: maxLvl,
        total_members: countNodes(hierarchy),
        direct_members: hierarchy.length,
        hierarchy: hierarchy
      }
    });
  } catch (error) {
    console.error('[TeamManagement] Error getting hierarchy:', error);
    res.status(500).json({ success: false, message: 'Failed to get hierarchy' });
  }
});

/**
 * GET /api/admin/team-management/search
 * Search users for team management
 */
router.get('/team-management/search', authMiddleware, async (req, res) => {
  try {
    const { q, page = 1, limit = 20, min_level = 0 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '1=1';
    let params = [];

    if (q) {
      whereClause += ' AND ub.wallet_address LIKE ?';
      params.push(`%${q}%`);
    }

    if (min_level > 0) {
      whereClause += ' AND COALESCE(bl.broker_level, 0) >= ?';
      params.push(parseInt(min_level));
    }

    // Get total count
    const countResult = await dbQuery(`
      SELECT COUNT(*) as total
      FROM user_balances ub
      LEFT JOIN broker_levels bl ON bl.wallet_address = ub.wallet_address
      WHERE ${whereClause}
    `, params);

    // Get users
    const users = await dbQuery(`
      SELECT
        ub.wallet_address,
        ub.usdt_balance,
        ub.total_deposit,
        ub.created_at,
        COALESCE(bl.broker_level, 0) as broker_level,
        COALESCE(bl.qualified_direct_members, 0) as qualified_direct_members,
        (SELECT COUNT(*) FROM user_referrals WHERE referrer_address = ub.wallet_address) as direct_referrals,
        (SELECT COALESCE(SUM(reward_amount), 0) FROM referral_rewards WHERE to_wallet = ub.wallet_address) as total_referral_reward,
        (SELECT COALESCE(SUM(reward_amount), 0) FROM team_dividend_records WHERE wallet_address = ub.wallet_address) as total_team_dividend
      FROM user_balances ub
      LEFT JOIN broker_levels bl ON bl.wallet_address = ub.wallet_address
      WHERE ${whereClause}
      ORDER BY COALESCE(bl.broker_level, 0) DESC, ub.total_deposit DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        usdt_balance: parseFloat(u.usdt_balance || 0),
        total_deposit: parseFloat(u.total_deposit || 0),
        total_referral_reward: parseFloat(u.total_referral_reward || 0),
        total_team_dividend: parseFloat(u.total_team_dividend || 0)
      })),
      pagination: {
        total: countResult[0]?.total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[TeamManagement] Error searching users:', error);
    res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

router.use(teamManagementActionRoutes);

export default router;
