import express from 'express';
import { normalizeWalletAddress } from '../security/index.js';

export async function fixReferralRewardsTable(dbQuery) {
    try {
        const columns = [
            {
                name: 'source_type',
                sql: "ALTER TABLE referral_rewards ADD COLUMN source_type VARCHAR(50) DEFAULT 'quantify' AFTER reward_amount"
            },
            {
                name: 'source_id',
                sql: 'ALTER TABLE referral_rewards ADD COLUMN source_id INT DEFAULT NULL AFTER source_type'
            },
            {
                name: 'robot_name',
                sql: 'ALTER TABLE referral_rewards ADD COLUMN robot_name VARCHAR(100) DEFAULT NULL AFTER source_id'
            }
        ];

        for (const column of columns) {
            try {
                await dbQuery(column.sql);
                console.log(`✅ 添加 ${column.name} 字段成功`);
            } catch (error) {
                if (!error.message.includes('Duplicate column')) {
                    console.log(`${column.name} 字段已存在或添加失败:`, error.message);
                }
            }
        }

        console.log('✅ referral_rewards 表修复完成');
    } catch (error) {
        console.error('❌ referral_rewards 表修复失败:', error.message);
    }
}

function parseLimit(limit) {
    return Math.min(parseInt(limit) || 20, 100);
}

export function createReferralRewardRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/referral-rewards/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const records = await dbQuery(
                `SELECT
                    id,
                    from_wallet,
                    level,
                    reward_amount,
                    source_type,
                    robot_name,
                    created_at
                FROM referral_rewards
                WHERE wallet_address = ?
                ORDER BY created_at DESC
                LIMIT ?`,
                [wallet_address.toLowerCase(), parseLimit(limit)]
            );

            res.json({
                success: true,
                data: records.map(record => ({
                    id: record.id,
                    from_wallet: record.from_wallet,
                    level: record.level,
                    reward_amount: parseFloat(record.reward_amount).toFixed(4),
                    source_type: record.source_type,
                    robot_name: record.robot_name,
                    created_at: record.created_at
                }))
            });
        } catch (error) {
            console.error('[API] Get referral rewards history error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch referral rewards history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/team-rewards/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const records = await dbQuery(
                `SELECT
                    id,
                    broker_level,
                    reward_type,
                    reward_amount,
                    reward_date,
                    created_at
                FROM team_rewards
                WHERE wallet_address = ?
                ORDER BY created_at DESC
                LIMIT ?`,
                [wallet_address.toLowerCase(), parseLimit(limit)]
            );

            res.json({
                success: true,
                data: records.map(record => ({
                    id: record.id,
                    broker_level: record.broker_level,
                    reward_type: record.reward_type,
                    reward_amount: parseFloat(record.reward_amount).toFixed(4),
                    reward_date: record.reward_date,
                    created_at: record.created_at
                }))
            });
        } catch (error) {
            console.error('[API] Get team rewards history error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch team rewards history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/referral/earnings', async (req, res) => {
        try {
            const { wallet_address, days = 30 } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const queryDays = Math.min(parseInt(days) || 30, 365);

            const totalEarnings = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as total_earnings, COUNT(*) as total_count
                 FROM referral_rewards
                 WHERE wallet_address = ?`,
                [walletAddr]
            );
            const recentEarnings = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as recent_earnings, COUNT(*) as recent_count
                 FROM referral_rewards
                 WHERE wallet_address = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
                [walletAddr, queryDays]
            );
            const todayEarnings = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as today_earnings
                 FROM referral_rewards
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );
            const earningsByLevel = await dbQuery(
                `SELECT level, COALESCE(SUM(reward_amount), 0) as level_earnings, COUNT(*) as level_count
                 FROM referral_rewards
                 WHERE wallet_address = ?
                 GROUP BY level
                 ORDER BY level`,
                [walletAddr]
            );
            const recentRecords = await dbQuery(
                `SELECT from_wallet, level, reward_amount, source_type, robot_name, created_at
                 FROM referral_rewards
                 WHERE wallet_address = ?
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [walletAddr]
            );

            res.json({
                success: true,
                data: {
                    total_earnings: parseFloat(totalEarnings[0].total_earnings).toFixed(4),
                    total_count: totalEarnings[0].total_count,
                    recent_earnings: parseFloat(recentEarnings[0].recent_earnings).toFixed(4),
                    recent_count: recentEarnings[0].recent_count,
                    today_earnings: parseFloat(todayEarnings[0].today_earnings).toFixed(4),
                    earnings_by_level: earningsByLevel.map(item => ({
                        level: item.level,
                        earnings: parseFloat(item.level_earnings).toFixed(4),
                        count: item.level_count
                    })),
                    recent_records: recentRecords.map(record => ({
                        from_wallet: record.from_wallet.slice(0, 6) + '...' + record.from_wallet.slice(-4),
                        level: record.level,
                        reward_amount: parseFloat(record.reward_amount).toFixed(4),
                        source_type: record.source_type,
                        robot_name: record.robot_name,
                        created_at: record.created_at
                    })),
                    days_range: queryDays
                }
            });
        } catch (error) {
            console.error('[API] Get referral earnings error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch referral earnings',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
