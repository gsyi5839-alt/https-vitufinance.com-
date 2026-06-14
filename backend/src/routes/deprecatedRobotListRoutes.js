import express from 'express';

export function createDeprecatedRobotListRoutes({
    dbQuery,
    processExpiredCexDexRobots,
    processExpiredGridRobots,
    processExpiredHighRobots
}) {
    const router = express.Router();

    router.get('/robot/my-old-deprecated', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = wallet_address.toLowerCase();
            await processExpiredCexDexRobots(walletAddr);

            const rows = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ? AND status = 'active' AND end_date >= CURDATE()
                 ORDER BY created_at DESC`,
                [walletAddr]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取用户机器人失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch robots',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/follow/my-old-deprecated', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = wallet_address.toLowerCase();
            await processExpiredHighRobots(walletAddr);
            await processExpiredGridRobots(walletAddr);

            const rows = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ? AND status = 'active' AND end_date >= CURDATE()
                 AND (robot_type = 'grid' OR robot_type = 'high')
                 ORDER BY created_at DESC`,
                [walletAddr]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取Follow页面机器人失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch follow robots',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/follow/today-purchases-old-deprecated', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const rows = await dbQuery(
                `SELECT robot_name, robot_type, CURDATE() as today_date FROM robot_purchases
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()
                 AND (robot_type = 'grid' OR robot_type = 'high')`,
                [wallet_address.toLowerCase()]
            );

            res.json({
                success: true,
                data: {
                    purchased_today: rows.map(row => row.robot_name),
                    date: rows[0]?.today_date || new Date().toISOString().split('T')[0]
                }
            });
        } catch (error) {
            console.error('获取今日购买记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch today purchases',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/follow/expired-old-deprecated', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = wallet_address.toLowerCase();
            await processExpiredHighRobots(walletAddr);
            await processExpiredGridRobots(walletAddr);

            const rows = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ? AND (status = 'expired' OR end_date < CURDATE())
                 AND (robot_type = 'grid' OR robot_type = 'high')
                 ORDER BY created_at DESC`,
                [walletAddr]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取Follow页面过期机器人失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch follow expired robots',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/robot/expired-old-deprecated', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = wallet_address.toLowerCase();
            await processExpiredCexDexRobots(walletAddr);

            const rows = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ? AND status = 'expired'
                 ORDER BY created_at DESC`,
                [walletAddr]
            );

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取过期机器人失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch expired robots',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/robot/count-old-deprecated', async (req, res) => {
        try {
            const { wallet_address, robot_id } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const rows = await dbQuery(
                `SELECT robot_id, robot_name, COUNT(*) as count
                 FROM robot_purchases
                 WHERE wallet_address = ? AND status = 'active' AND end_date >= CURDATE()
                 GROUP BY robot_id, robot_name`,
                [wallet_address.toLowerCase()]
            );

            if (robot_id) {
                const robot = rows.find(row => row.robot_id === robot_id);
                return res.json({
                    success: true,
                    data: {
                        robot_id,
                        count: robot ? robot.count : 0
                    }
                });
            }

            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('获取机器人购买数量失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch robot count',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
