import express from 'express';

function maskWallet(walletAddress) {
    return walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
}

function getReferralQuery(level) {
    const baseSelect = `SELECT r.wallet_address, r.created_at,
            COALESCE(b.total_deposit, 0) as total_deposit,
            COALESCE(b.usdt_balance, 0) as balance
        FROM user_referrals r
        LEFT JOIN user_balances b ON r.wallet_address = b.wallet_address`;

    if (level == 2) {
        return `${baseSelect}
            WHERE r.referrer_address IN (
                SELECT wallet_address FROM user_referrals WHERE referrer_address = ?
            )
            ORDER BY r.created_at DESC`;
    }

    if (level == 3) {
        return `${baseSelect}
            WHERE r.referrer_address IN (
                SELECT wallet_address FROM user_referrals
                WHERE referrer_address IN (
                    SELECT wallet_address FROM user_referrals WHERE referrer_address = ?
                )
            )
            ORDER BY r.created_at DESC`;
    }

    if (level == 1) {
        return `${baseSelect}
            WHERE r.referrer_address = ?
            ORDER BY r.created_at DESC`;
    }

    return null;
}

export function createInviteReferralRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/referrals', async (req, res) => {
        try {
            const { wallet_address, level = 1 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address is required'
                });
            }

            const query = getReferralQuery(level);
            const rows = query
                ? await dbQuery(query, [wallet_address.toLowerCase()])
                : [];

            res.json({
                success: true,
                data: rows.map(row => ({
                    ...row,
                    wallet_address: maskWallet(row.wallet_address),
                    total_deposit: parseFloat(row.total_deposit).toFixed(4),
                    balance: parseFloat(row.balance).toFixed(4)
                }))
            });
        } catch (error) {
            console.error('获取下级列表失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch referrals',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
