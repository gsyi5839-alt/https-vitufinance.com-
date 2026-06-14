import express from 'express';
import { isValidWalletAddress, normalizeWalletAddress } from '../security/index.js';

function maskWallet(walletAddress) {
    return walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
}

async function buildLevelStats(dbQuery, walletAddr) {
    const levelStats = [];

    for (let level = 1; level <= 8; level++) {
        let query = 'SELECT COUNT(*) as count FROM user_referrals WHERE ';
        const params = [walletAddr];

        if (level === 1) {
            query += 'referrer_address = ?';
        } else {
            let subquery = 'referrer_address = ?';
            for (let i = 1; i < level; i++) {
                subquery = `referrer_address IN (SELECT wallet_address FROM user_referrals WHERE ${subquery})`;
            }
            query += subquery;
        }

        const result = await dbQuery(query, params);
        levelStats.push({
            level,
            count: result[0].count
        });
    }

    return levelStats;
}

export function createReferralRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/info', async (req, res) => {
        try {
            const { wallet_address } = req.query;

            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            if (!isValidWalletAddress(wallet_address)) {
                return res.status(400).json({ success: false, message: 'Invalid wallet address format' });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const referralInfo = await dbQuery(
                'SELECT referrer_address, created_at FROM user_referrals WHERE wallet_address = ?',
                [walletAddr]
            );

            let referrerAddress = null;
            if (referralInfo.length === 0) {
                await dbQuery(
                    "INSERT INTO user_referrals (wallet_address, referrer_address, referrer_code, created_at) VALUES (?, NULL, '', NOW())",
                    [walletAddr]
                );
            } else {
                referrerAddress = referralInfo[0].referrer_address;
            }

            const teamStats = await dbQuery(
                'SELECT COUNT(*) as total_referrals FROM user_referrals WHERE referrer_address = ?',
                [walletAddr]
            );
            const rewardStats = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as total_rewards
                 FROM referral_rewards
                 WHERE wallet_address = ?`,
                [walletAddr]
            );
            const todayRewards = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as today_rewards
                 FROM referral_rewards
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );

            res.json({
                success: true,
                data: {
                    wallet_address: walletAddr,
                    referral_code: walletAddr.slice(-8).toUpperCase(),
                    referrer_address: referrerAddress,
                    total_referrals: teamStats[0].total_referrals || 0,
                    total_rewards: parseFloat(rewardStats[0].total_rewards || 0).toFixed(4),
                    today_rewards: parseFloat(todayRewards[0].today_rewards || 0).toFixed(4)
                }
            });
        } catch (error) {
            console.error('[API] Get referral info error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch referral info',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/team', async (req, res) => {
        try {
            const { wallet_address, page = 1, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const rawLimit = parseInt(limit) || 20;
            const queryLimit = Math.min(rawLimit, 100);
            const offset = (parseInt(page) - 1) * rawLimit;

            const teamMembers = await dbQuery(
                `SELECT
                    r.wallet_address,
                    r.created_at as join_date,
                    COALESCE(b.total_deposit, 0) as total_deposit,
                    COALESCE(b.usdt_balance, 0) as current_balance,
                    (SELECT COUNT(*) FROM robot_purchases WHERE wallet_address = r.wallet_address AND status = 'active') as active_robots
                 FROM user_referrals r
                 LEFT JOIN user_balances b ON r.wallet_address = b.wallet_address
                 WHERE r.referrer_address = ?
                 ORDER BY r.created_at DESC
                 LIMIT ? OFFSET ?`,
                [walletAddr, queryLimit, offset]
            );

            const totalCount = await dbQuery(
                'SELECT COUNT(*) as total FROM user_referrals WHERE referrer_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                data: {
                    team_members: teamMembers.map(member => ({
                        wallet_address: maskWallet(member.wallet_address),
                        join_date: member.join_date,
                        total_deposit: parseFloat(member.total_deposit).toFixed(4),
                        current_balance: parseFloat(member.current_balance).toFixed(4),
                        active_robots: member.active_robots
                    })),
                    total_members: totalCount[0].total,
                    level_stats: await buildLevelStats(dbQuery, walletAddr),
                    page: parseInt(page),
                    limit: queryLimit,
                    total_pages: Math.ceil(totalCount[0].total / queryLimit)
                }
            });
        } catch (error) {
            console.error('[API] Get team info error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch team info',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
