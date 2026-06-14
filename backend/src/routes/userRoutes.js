import express from 'express';
import {
    isValidWalletAddress,
    normalizeWalletAddress,
    secureLog
} from '../security/index.js';
import { recordSuspiciousActivity } from '../middleware/security.js';

export function createUserRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/balance', async (req, res) => {
        try {
            const { wallet_address } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address is required'
                });
            }

            if (!isValidWalletAddress(wallet_address)) {
                recordSuspiciousActivity(req.ip, '无效的钱包地址格式');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const rows = await dbQuery(
                'SELECT usdt_balance, wld_balance, total_deposit, total_withdraw FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            if (rows.length === 0) {
                secureLog('创建新用户', { wallet_address: walletAddr });
                await dbQuery(
                    'INSERT INTO user_balances (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at) VALUES (?, 0, 0, 0, 0, NOW(), NOW())',
                    [walletAddr]
                );

                return res.json({
                    success: true,
                    data: {
                        wallet_address: walletAddr,
                        usdt_balance: '0.0000',
                        wld_balance: '0.0000',
                        total_deposit: '0.0000',
                        total_withdraw: '0.0000',
                        total_referral_reward: '0.0000',
                        total_team_reward: '0.0000'
                    }
                });
            }

            const referralRewardResult = await dbQuery(
                'SELECT COALESCE(SUM(reward_amount), 0) as total FROM referral_rewards WHERE wallet_address = ?',
                [walletAddr]
            );
            const totalReferralReward = parseFloat(referralRewardResult[0]?.total) || 0;

            const teamRewardResult = await dbQuery(
                'SELECT COALESCE(SUM(reward_amount), 0) as total FROM team_rewards WHERE wallet_address = ?',
                [walletAddr]
            );
            const totalTeamReward = parseFloat(teamRewardResult[0]?.total) || 0;

            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            res.json({
                success: true,
                data: {
                    wallet_address: walletAddr,
                    usdt_balance: parseFloat(rows[0].usdt_balance).toFixed(4),
                    wld_balance: parseFloat(rows[0].wld_balance).toFixed(4),
                    total_deposit: parseFloat(rows[0].total_deposit).toFixed(4),
                    total_withdraw: parseFloat(rows[0].total_withdraw).toFixed(4),
                    total_referral_reward: totalReferralReward.toFixed(4),
                    total_team_reward: totalTeamReward.toFixed(4),
                    _timestamp: Date.now(),
                    _data_version: rows[0].updated_at ? new Date(rows[0].updated_at).getTime() : Date.now()
                }
            });
        } catch (error) {
            console.error('获取用户余额失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user balance',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
