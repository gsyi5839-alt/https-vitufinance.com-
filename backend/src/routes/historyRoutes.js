import express from 'express';

function parseHistoryLimit(limit) {
    const parsed = parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(parsed, 100);
}

async function getTransactionHistoryColumns(dbQuery) {
    try {
        const columns = await dbQuery('SHOW COLUMNS FROM transaction_history');
        return new Set(columns.map(column => column.Field));
    } catch (error) {
        console.warn('[History] transaction_history is unavailable:', error.message);
        return new Set();
    }
}

function buildTransactionHistoryQuery(columns) {
    if (!columns.has('wallet_address') || !columns.has('amount') || !columns.has('created_at')) {
        return null;
    }

    const typeColumn = columns.has('tx_type') ? 'tx_type' : (columns.has('type') ? 'type' : null);
    const tokenColumn = columns.has('token') ? 'token' : (columns.has('currency') ? 'currency' : null);
    const statusColumn = columns.has('status') ? 'status' : null;
    const descriptionColumn = columns.has('description') ? 'description' : null;
    const columnRef = column => `\`${column}\``;

    const typeExpr = typeColumn ? columnRef(typeColumn) : "'refund'";
    const tokenExpr = tokenColumn ? columnRef(tokenColumn) : "'USDT'";
    const statusExpr = statusColumn
        ? "CASE WHEN `status` IN ('success', 'completed') THEN 'completed' WHEN `status` = 'failed' THEN 'failed' ELSE 'pending' END"
        : "'completed'";
    const descriptionExpr = descriptionColumn ? columnRef(descriptionColumn) : "''";

    const refundConditions = [];
    const params = [];
    if (typeColumn) {
        refundConditions.push(`${columnRef(typeColumn)} IN (?, ?, ?, ?, ?, ?)`);
        params.push(
            'refund',
            'robot_cancel_refund',
            'robot_batch_cancel_refund',
            'margin_refund',
            'security_deposit_refund',
            'deposit_refund'
        );
    }
    if (descriptionColumn) {
        refundConditions.push('(`description` LIKE ? OR `description` LIKE ? OR `description` LIKE ? OR LOWER(`description`) LIKE ?)');
        params.push('%保证金%', '%退还%', '%返还%', '%refund%');
    }

    if (refundConditions.length === 0) {
        refundConditions.push('1 = 1');
    }

    return {
        sql: `SELECT id, wallet_address, ${typeExpr} AS tx_type, amount, ${tokenExpr} AS token,
                    ${statusExpr} AS status, ${descriptionExpr} AS description, created_at
             FROM transaction_history
             WHERE LOWER(wallet_address) = LOWER(?)
             AND amount > 0
             AND (${refundConditions.join(' OR ')})
             ORDER BY created_at DESC
             LIMIT ?`,
        params
    };
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

    router.get('/transaction/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address parameter is required'
                });
            }

            const columns = await getTransactionHistoryColumns(dbQuery);
            const queryConfig = buildTransactionHistoryQuery(columns);
            if (!queryConfig) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const walletAddr = String(wallet_address).toLowerCase();
            const records = await dbQuery(
                queryConfig.sql,
                [walletAddr, ...queryConfig.params, parseHistoryLimit(limit)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取交易历史失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
