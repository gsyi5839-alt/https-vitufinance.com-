import express from 'express';
import { formatDateTime, getDbQuery, normalizeWalletAddress } from '../services/robotContext.js';
import { processExpiredRobots } from '../services/robotExpiryService.js';

const router = express.Router();

router.get('/api/robot/my', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        await processExpiredRobots(walletAddr, ['cex', 'dex']);

        const rows = await dbQuery(
            `SELECT *,
                TIMESTAMPDIFF(HOUR, NOW(), end_time) as hours_remaining,
                CASE WHEN end_time <= NOW() THEN 1 ELSE 0 END as is_expired
             FROM robot_purchases
             WHERE wallet_address = ? AND status = 'active' AND end_time > NOW()
             AND robot_type IN ('cex', 'dex')
             ORDER BY created_at DESC`,
            [walletAddr]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取用户机器人失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch robots' });
    }
});

router.get('/api/follow/my', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        await processExpiredRobots(walletAddr, ['grid', 'high']);

        const rows = await dbQuery(
            `SELECT *,
                TIMESTAMPDIFF(HOUR, NOW(), end_time) as hours_remaining,
                CASE WHEN end_time <= NOW() THEN 1 ELSE 0 END as is_expired
             FROM robot_purchases
             WHERE wallet_address = ? AND status = 'active' AND end_time > NOW()
             AND robot_type IN ('grid', 'high')
             ORDER BY created_at DESC`,
            [walletAddr]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取Follow页面机器人失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch follow robots' });
    }
});

router.get('/api/robot/expired', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        await processExpiredRobots(walletAddr, ['cex', 'dex']);

        const rows = await dbQuery(
            `SELECT * FROM robot_purchases
             WHERE wallet_address = ?
             AND (status = 'expired' OR end_time <= NOW())
             AND robot_type IN ('cex', 'dex')
             ORDER BY end_time DESC`,
            [walletAddr]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取过期机器人失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch expired robots' });
    }
});

router.get('/api/follow/expired', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        await processExpiredRobots(walletAddr, ['grid', 'high']);

        const rows = await dbQuery(
            `SELECT * FROM robot_purchases
             WHERE wallet_address = ?
             AND (status = 'expired' OR end_time <= NOW())
             AND robot_type IN ('grid', 'high')
             ORDER BY end_time DESC`,
            [walletAddr]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取Follow页面过期机器人失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch follow expired robots' });
    }
});

router.get('/api/follow/today-purchases', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatDateTime(today);

        const rows = await dbQuery(
            `SELECT robot_name, robot_type FROM robot_purchases
             WHERE wallet_address = ? AND created_at >= ?
             AND robot_type IN ('grid', 'high')`,
            [walletAddr, todayStr]
        );

        res.json({
            success: true,
            data: {
                purchased_today: rows.map(row => row.robot_name),
                date: todayStr.split(' ')[0]
            }
        });
    } catch (error) {
        console.error('获取今日购买记录失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch today purchases' });
    }
});

router.get('/api/robot/count', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address, robot_id } = req.query;
        if (!wallet_address) {
            return res.status(400).json({ success: false, message: 'wallet_address is required' });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        const rows = await dbQuery(
            `SELECT
                robot_id,
                robot_name,
                SUM(CASE WHEN status = 'active' AND end_time > NOW() THEN 1 ELSE 0 END) as active_count,
                COUNT(*) as total_count
             FROM robot_purchases
             WHERE wallet_address = ?
             GROUP BY robot_id, robot_name`,
            [walletAddr]
        );

        if (robot_id) {
            const robot = rows.find(row => row.robot_id === robot_id);
            return res.json({
                success: true,
                data: {
                    robot_id,
                    count: robot ? robot.active_count : 0,
                    active_count: robot ? robot.active_count : 0,
                    total_count: robot ? robot.total_count : 0
                }
            });
        }

        res.json({
            success: true,
            data: rows.map(row => ({
                ...row,
                count: row.active_count
            }))
        });
    } catch (error) {
        console.error('获取机器人购买数量失败:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch robot count' });
    }
});

export default router;
