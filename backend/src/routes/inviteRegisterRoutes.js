import express from 'express';

const REFERRER_LOOKUPS = [
    {
        table: 'user_balances',
        label: 'user_balances',
        sql: 'SELECT wallet_address FROM user_balances WHERE LOWER(RIGHT(wallet_address, 8)) = ?'
    },
    {
        table: 'user_referrals',
        label: 'user_referrals',
        sql: 'SELECT wallet_address FROM user_referrals WHERE LOWER(RIGHT(wallet_address, 8)) = ?'
    },
    {
        table: 'deposit_records',
        label: 'deposit_records',
        sql: 'SELECT DISTINCT wallet_address FROM deposit_records WHERE LOWER(RIGHT(wallet_address, 8)) = ? LIMIT 1'
    },
    {
        table: 'robot_purchases',
        label: 'robot_purchases',
        sql: 'SELECT DISTINCT wallet_address FROM robot_purchases WHERE LOWER(RIGHT(wallet_address, 8)) = ? LIMIT 1'
    }
];

async function findReferrerAddress(dbQuery, refCode) {
    for (const lookup of REFERRER_LOOKUPS) {
        const result = await dbQuery(lookup.sql, [refCode]);
        if (result.length > 0) {
            const referrerAddress = result[0].wallet_address;
            console.log(`[Invite Register] Found referrer in ${lookup.label}: ${referrerAddress.slice(0, 10)}...`);
            return referrerAddress;
        }
    }

    return null;
}

export function createInviteRegisterRoutes({
    dbQuery,
    addLuckyPoints,
    processUplineDailyDividends
}) {
    const router = express.Router();

    router.post('/register', async (req, res) => {
        try {
            const { wallet_address, referrer_code } = req.body;

            if (!wallet_address || !referrer_code) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and referrer_code are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const refCode = referrer_code.toLowerCase();

            const existing = await dbQuery(
                'SELECT id FROM user_referrals WHERE wallet_address = ?',
                [walletAddr]
            );

            if (existing.length > 0) {
                return res.json({
                    success: true,
                    message: 'Referral already registered'
                });
            }

            const referrerAddress = await findReferrerAddress(dbQuery, refCode);

            if (!referrerAddress) {
                console.log(`[Invite Register] Referrer not found for code: ${refCode}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid referral code - referrer not found'
                });
            }

            if (referrerAddress.toLowerCase() === walletAddr) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot refer yourself'
                });
            }

            await dbQuery(
                'INSERT INTO user_referrals (wallet_address, referrer_address, referrer_code, created_at) VALUES (?, ?, ?, NOW())',
                [walletAddr, referrerAddress, refCode]
            );

            await dbQuery(
                `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
                 VALUES (?, 0, 0, NOW(), NOW())`,
                [walletAddr]
            );
            await dbQuery(
                `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
                 VALUES (?, 0, 0, NOW(), NOW())`,
                [referrerAddress]
            );

            console.log(`[Invite Register] Successfully registered: ${walletAddr.slice(0, 10)}... -> referrer: ${referrerAddress.slice(0, 10)}...`);

            try {
                await addLuckyPoints(referrerAddress, 500, 'invite_reward');
                console.log(`[Invite Register] 推荐人 ${referrerAddress.slice(0, 10)}... 获得 500 幸运值`);
            } catch (luckyErr) {
                console.error('[Invite Register] 添加幸运值失败:', luckyErr);
            }

            res.json({
                success: true,
                message: 'Referral registered successfully'
            });

            processUplineDailyDividends(walletAddr)
                .then(result => {
                    if (result.rewarded > 0) {
                        console.log(`[Invite Register] ✅ 新推荐触发上级分红: ${result.rewarded} 人获得分红`);
                    }
                })
                .catch(err => {
                    console.error('[Invite Register] ❌ 触发上级分红失败:', err.message);
                });
        } catch (error) {
            console.error('注册邀请关系失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to register referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
