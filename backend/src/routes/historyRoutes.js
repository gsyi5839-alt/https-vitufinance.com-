import express from 'express';

function parseHistoryLimit(limit) {
    const parsed = parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(parsed, 100);
}

export function createHistoryRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/deposit/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address parameter is required'
                });
            }

            const walletAddr = String(wallet_address).toLowerCase();
            const records = await dbQuery(
                `SELECT id, wallet_address, amount, token, tx_hash, status, created_at, completed_at
                 FROM deposit_records
                 WHERE wallet_address = ?
                 ORDER BY created_at DESC
                 LIMIT ?`,
                [walletAddr, parseHistoryLimit(limit)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取充值记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get deposit history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/withdraw/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address parameter is required'
                });
            }

            const walletAddr = String(wallet_address).toLowerCase();
            const records = await dbQuery(
                `SELECT id, wallet_address, to_address, amount, fee, actual_amount, token, tx_hash, status, created_at, completed_at
                 FROM withdraw_records
                 WHERE wallet_address = ?
                 ORDER BY created_at DESC
                 LIMIT ?`,
                [walletAddr, parseHistoryLimit(limit)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取提现记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get withdraw history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/margin-refund/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address parameter is required'
                });
            }

            const walletAddr = String(wallet_address).toLowerCase();
            const records = await dbQuery(
                `SELECT id,
                        COALESCE(tx_hash, CONCAT('MR-', LPAD(id, 8, '0'))) AS order_no,
                        wallet_address,
                        amount,
                        token,
                        currency,
                        status,
                        description,
                        related_id,
                        related_type,
                        created_at
                 FROM transaction_history
                 WHERE LOWER(wallet_address) = LOWER(?)
                   AND tx_type = 'margin_refund'
                   AND direction = 'in'
                   AND status IN ('completed', 'success')
                 ORDER BY created_at DESC
                 LIMIT ?`,
                [walletAddr, parseHistoryLimit(limit)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取保证金退还记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get margin refund history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
