import express from 'express';

const CHECKIN_REWARD_WLD = 2.0000;

export async function initCheckinTable(dbQuery) {
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS daily_checkin (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                wallet_address VARCHAR(42) NOT NULL COMMENT '钱包地址（小写）',
                checkin_date DATE NOT NULL COMMENT '签到日期',
                day_number INT(11) NOT NULL DEFAULT 1 COMMENT '连续签到天数（1-10）',
                reward_amount DECIMAL(10,4) NOT NULL DEFAULT 2.0000 COMMENT '奖励WLD数量',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                PRIMARY KEY (id),
                UNIQUE KEY uk_wallet_date (wallet_address, checkin_date),
                KEY idx_wallet_address (wallet_address),
                KEY idx_checkin_date (checkin_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到记录表'
        `);
        console.log('✅ 签到表初始化成功');
    } catch (error) {
        console.error('❌ 签到表初始化失败:', error.message);
    }
}

function normalizeWalletParam(wallet) {
    return String(wallet || '').toLowerCase();
}

export function createCheckinRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/status', async (req, res) => {
        try {
            const { wallet } = req.query;
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet parameter is required'
                });
            }

            const walletAddr = normalizeWalletParam(wallet);
            const todayCheckin = await dbQuery(
                'SELECT *, CURDATE() as today_date FROM daily_checkin WHERE wallet_address = ? AND checkin_date = CURDATE()',
                [walletAddr]
            );
            const totalCheckins = await dbQuery(
                'SELECT COUNT(*) as total FROM daily_checkin WHERE wallet_address = ?',
                [walletAddr]
            );
            const recentCheckins = await dbQuery(
                `SELECT checkin_date, day_number, reward_amount
                 FROM daily_checkin
                 WHERE wallet_address = ?
                 ORDER BY checkin_date DESC
                 LIMIT 10`,
                [walletAddr]
            );
            const totalCount = totalCheckins[0]?.total || 0;
            const currentDay = todayCheckin.length > 0
                ? todayCheckin[0].day_number
                : (totalCount % 10) + 1;
            const dateResult = await dbQuery('SELECT CURDATE() as today_date');

            res.json({
                success: true,
                data: {
                    claimedToday: todayCheckin.length > 0,
                    totalCheckins: totalCount,
                    currentDay,
                    serverDate: dateResult[0]?.today_date,
                    recentCheckins: recentCheckins.map((row) => ({
                        date: new Date(row.checkin_date).toISOString().slice(0, 10),
                        dayNumber: row.day_number,
                        reward: parseFloat(row.reward_amount)
                    }))
                }
            });
        } catch (error) {
            console.error('获取签到状态失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get checkin status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.post('/claim', async (req, res) => {
        try {
            const { wallet } = req.body;
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet parameter is required'
                });
            }

            const walletAddr = normalizeWalletParam(wallet);
            const existingCheckin = await dbQuery(
                'SELECT * FROM daily_checkin WHERE wallet_address = ? AND checkin_date = CURDATE()',
                [walletAddr]
            );

            if (existingCheckin.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Already claimed today',
                    data: {
                        claimedToday: true,
                        dayNumber: existingCheckin[0].day_number
                    }
                });
            }

            const totalCheckins = await dbQuery(
                'SELECT COUNT(*) as total FROM daily_checkin WHERE wallet_address = ?',
                [walletAddr]
            );
            const dayNumber = ((totalCheckins[0]?.total || 0) % 10) + 1;

            await dbQuery(
                `INSERT INTO daily_checkin (wallet_address, checkin_date, day_number, reward_amount)
                 VALUES (?, CURDATE(), ?, ?)`,
                [walletAddr, dayNumber, CHECKIN_REWARD_WLD]
            );

            const userBalance = await dbQuery(
                'SELECT * FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            if (userBalance.length === 0) {
                await dbQuery(
                    'INSERT INTO user_balances (wallet_address, wld_balance) VALUES (?, ?)',
                    [walletAddr, CHECKIN_REWARD_WLD]
                );
            } else {
                await dbQuery(
                    'UPDATE user_balances SET wld_balance = wld_balance + ? WHERE wallet_address = ?',
                    [CHECKIN_REWARD_WLD, walletAddr]
                );
            }

            const updatedBalance = await dbQuery(
                'SELECT wld_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                message: 'Checkin successful',
                data: {
                    dayNumber,
                    reward: CHECKIN_REWARD_WLD,
                    newWldBalance: updatedBalance.length > 0
                        ? parseFloat(updatedBalance[0].wld_balance)
                        : CHECKIN_REWARD_WLD
                }
            });
        } catch (error) {
            console.error('签到失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Checkin failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/records', async (req, res) => {
        try {
            const { wallet } = req.query;
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet parameter is required'
                });
            }

            const records = await dbQuery(
                `SELECT id, wallet_address, checkin_date, day_number, reward_amount, created_at
                 FROM daily_checkin
                 WHERE wallet_address = ?
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [normalizeWalletParam(wallet)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取签到记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get checkin records',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
