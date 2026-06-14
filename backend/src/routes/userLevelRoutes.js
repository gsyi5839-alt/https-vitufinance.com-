import express from 'express';

const DAILY_WLD_LIMIT_BY_LEVEL = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 5,
    5: 10
};

export function createUserLevelRoutes({
    dbQuery,
    calculateUserLevel,
    collectTeamWallets,
    getLevelName,
    getQualifiedDirectCounts,
    getSubBrokerStats,
    getTeamPerformance
}) {
    const router = express.Router();

    router.get('/level', async (req, res) => {
        try {
            const { wallet } = req.query;

            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet parameter is required'
                });
            }

            const walletAddr = wallet.toLowerCase();
            const level = await calculateUserLevel(walletAddr);
            const dailyWldLimit = DAILY_WLD_LIMIT_BY_LEVEL[level] || 0;

            const todayExchanged = await dbQuery(
                `SELECT COALESCE(SUM(wld_amount), 0) as total
                 FROM wld_exchange_records
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE() AND direction = 'wld_to_usdt'`,
                [walletAddr]
            );

            const exchangedToday = parseFloat(todayExchanged[0]?.total) || 0;
            const directCounts = await getQualifiedDirectCounts(walletAddr);
            const directCount = level >= 1 ? directCounts.lv2_5 : directCounts.lv1;
            const allTeamWallets = await collectTeamWallets(walletAddr);
            const totalPerformance = await getTeamPerformance(allTeamWallets);
            const subBrokers = await getSubBrokerStats(walletAddr);

            res.json({
                success: true,
                data: {
                    level,
                    levelName: getLevelName(level),
                    dailyWldLimit,
                    exchangedToday,
                    remainingToday: Math.max(0, dailyWldLimit - exchangedToday),
                    directReferrals: directCount,
                    teamPerformance: totalPerformance.toFixed(4),
                    subBrokers
                }
            });
        } catch (error) {
            console.error('获取用户等级失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get user level',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
