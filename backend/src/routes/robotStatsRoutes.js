import express from 'express';

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function validateWallet(walletAddress, res, req = null) {
    if (!walletAddress) {
        res.status(400).json({
            success: false,
            message: 'wallet_address is required'
        });
        return null;
    }

    if (!WALLET_ADDRESS_PATTERN.test(walletAddress)) {
        if (req) {
            console.warn(`[Security] Invalid wallet format from ${req.ip}: ${String(walletAddress).substring(0, 50)}`);
        }
        res.status(400).json({
            success: false,
            message: 'Invalid wallet address format'
        });
        return null;
    }

    return walletAddress.toLowerCase();
}

function getDateCondition(period) {
    switch (period) {
        case 'today':
            return 'AND DATE(q.created_at) = CURDATE()';
        case 'week':
            return 'AND q.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)';
        case 'month':
            return 'AND q.created_at >= DATE_FORMAT(CURDATE(), "%Y-%m-01")';
        default:
            return '';
    }
}

export function createRobotStatsRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/today-earnings', async (req, res) => {
        try {
            const walletAddr = validateWallet(req.query.wallet_address, res);
            if (!walletAddr) return;

            const earningsResult = await dbQuery(
                `SELECT COALESCE(SUM(earning_amount), 0) as total_earnings
                 FROM robot_earnings
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );
            const quantifyEarnings = parseFloat(earningsResult[0]?.total_earnings) || 0;

            const referralResult = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as total_rewards
                 FROM referral_rewards
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );
            const referralRewards = parseFloat(referralResult[0]?.total_rewards) || 0;
            const todayTotalEarnings = quantifyEarnings + referralRewards;
            const dateResult = await dbQuery('SELECT CURDATE() as today_date');

            console.log(
                `[Today Earnings] ${walletAddr.slice(0, 10)}... 今日总收益: ` +
                `${todayTotalEarnings.toFixed(4)} USDT ` +
                `(量化: ${quantifyEarnings.toFixed(4)}, 推荐: ${referralRewards.toFixed(4)})`
            );

            res.json({
                success: true,
                data: {
                    today_earnings: todayTotalEarnings.toFixed(4),
                    quantify_earnings: quantifyEarnings.toFixed(4),
                    referral_rewards: referralRewards.toFixed(4),
                    date: dateResult[0]?.today_date
                }
            });
        } catch (error) {
            console.error('获取今日总收益失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch today earnings',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/quantify-history', async (req, res) => {
        try {
            const { limit = 50, offset = 0, period = 'all' } = req.query;
            const walletAddr = validateWallet(req.query.wallet_address, res, req);
            if (!walletAddr) return;

            const queryLimit = Math.max(1, Math.min(parseInt(limit) || 50, 100));
            const queryOffset = Math.max(0, parseInt(offset) || 0);
            const dateCondition = getDateCondition(period);
            const queryParams = [walletAddr];

            const records = await dbQuery(
                `SELECT
                    q.id,
                    q.robot_purchase_id,
                    q.robot_name,
                    q.earnings,
                    q.created_at,
                    p.robot_type,
                    p.price as principal,
                    p.daily_profit
                 FROM robot_quantify_logs q
                 LEFT JOIN robot_purchases p ON q.robot_purchase_id = p.id
                 WHERE q.wallet_address = ? ${dateCondition}
                 ORDER BY q.created_at DESC
                 LIMIT ? OFFSET ?`,
                [...queryParams, queryLimit, queryOffset]
            );

            const countResult = await dbQuery(
                `SELECT COUNT(*) as total FROM robot_quantify_logs q WHERE q.wallet_address = ? ${dateCondition}`,
                queryParams
            );
            const totalEarningsResult = await dbQuery(
                `SELECT COALESCE(SUM(earnings), 0) as total_earnings
                 FROM robot_quantify_logs q
                 WHERE q.wallet_address = ? ${dateCondition}`,
                queryParams
            );

            res.json({
                success: true,
                data: {
                    records,
                    total: countResult[0]?.total || 0,
                    total_earnings: (parseFloat(totalEarningsResult[0]?.total_earnings) || 0).toFixed(4),
                    limit: queryLimit,
                    offset: queryOffset,
                    period
                }
            });
        } catch (error) {
            console.error('获取量化收益明细失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch quantify history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/quantify-stats', async (req, res) => {
        try {
            const walletAddr = validateWallet(req.query.wallet_address, res);
            if (!walletAddr) return;

            const statsResult = await dbQuery(
                `SELECT
                    COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN earnings ELSE 0 END), 0) as today_earnings,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN earnings ELSE 0 END), 0) as week_earnings,
                    COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN earnings ELSE 0 END), 0) as month_earnings,
                    COALESCE(SUM(earnings), 0) as total_earnings,
                    COUNT(*) as total_count,
                    CURDATE() as server_date
                 FROM robot_quantify_logs
                 WHERE wallet_address = ?`,
                [walletAddr]
            );

            const stats = statsResult[0] || {};
            res.json({
                success: true,
                data: {
                    today_earnings: parseFloat(stats.today_earnings || 0).toFixed(4),
                    week_earnings: parseFloat(stats.week_earnings || 0).toFixed(4),
                    month_earnings: parseFloat(stats.month_earnings || 0).toFixed(4),
                    total_earnings: parseFloat(stats.total_earnings || 0).toFixed(4),
                    total_count: stats.total_count || 0,
                    server_date: stats.server_date
                }
            });
        } catch (error) {
            console.error('获取量化收益统计失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch quantify stats',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
