import express from 'express';
import {
    isValidWalletAddress,
    normalizeWalletAddress,
    isValidAmount,
    secureLog
} from '../security/index.js';
import {
    sensitiveLimiter,
    recordSuspiciousActivity
} from '../middleware/security.js';

function getAdminKey() {
    return process.env.ADMIN_KEY || (process.env.NODE_ENV !== 'production'
        ? 'dev_admin_key_not_for_production'
        : null);
}

export function createAdminCompatRoutes({ dbQuery, manualProcessDividends }) {
    const router = express.Router();

    router.post('/add-balance', sensitiveLimiter, async (req, res) => {
        try {
            const { wallet_address, amount, admin_key } = req.body;
            const adminKey = getAdminKey();

            if (!adminKey) {
                console.error('❌ 生产环境必须设置 ADMIN_KEY 环境变量');
                return res.status(500).json({
                    success: false,
                    message: 'Server configuration error'
                });
            }

            if (!admin_key || admin_key !== adminKey) {
                recordSuspiciousActivity(req.ip, '管理员接口认证失败');
                secureLog('管理员接口认证失败', { ip: req.ip });
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            if (!wallet_address || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and amount are required'
                });
            }

            if (!isValidWalletAddress(wallet_address)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }

            if (!isValidAmount(amount, 0.0001, 1000000)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount (must be between 0.0001 and 1000000)'
                });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const addAmount = parseFloat(amount);
            const userExists = await dbQuery(
                'SELECT id FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            if (userExists.length === 0) {
                await dbQuery(
                    'INSERT INTO user_balances (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at) VALUES (?, ?, 0, ?, 0, NOW(), NOW())',
                    [walletAddr, addAmount, addAmount]
                );
            } else {
                await dbQuery(
                    'UPDATE user_balances SET usdt_balance = usdt_balance + ?, total_deposit = total_deposit + ?, updated_at = NOW() WHERE wallet_address = ?',
                    [addAmount, addAmount, walletAddr]
                );
            }

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance, total_deposit FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            secureLog('管理员添加余额', { wallet_address: walletAddr, amount: addAmount, ip: req.ip });

            res.json({
                success: true,
                message: 'Balance added successfully',
                data: {
                    wallet_address: walletAddr,
                    added_amount: addAmount.toFixed(4),
                    new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4),
                    total_deposit: parseFloat(updatedBalance[0].total_deposit).toFixed(4)
                }
            });
        } catch (error) {
            console.error('添加余额失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to add balance',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.post('/trigger-team-dividend', sensitiveLimiter, async (req, res) => {
        try {
            const { admin_key } = req.body;
            const adminKey = getAdminKey();

            if (!adminKey) {
                console.error('❌ [Security] ADMIN_KEY 未配置，生产环境拒绝访问');
                return res.status(500).json({
                    success: false,
                    message: 'Server configuration error: ADMIN_KEY not set'
                });
            }

            if (admin_key !== adminKey) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid admin key'
                });
            }

            console.log('[Admin] 手动触发团队分红...');
            const result = await manualProcessDividends();

            res.json({
                success: result.success,
                message: result.success ? 'Team dividend processed successfully' : 'Failed to process team dividend',
                data: result
            });
        } catch (error) {
            console.error('触发团队分红失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to trigger team dividend',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
