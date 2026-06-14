import express from 'express';

const DAILY_WLD_LIMIT_BY_LEVEL = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 5,
    5: 10
};

function formatBalance(row) {
    return {
        newUsdtBalance: parseFloat(row.usdt_balance).toFixed(4),
        newWldBalance: parseFloat(row.wld_balance).toFixed(4)
    };
}

async function getWldPrice(fetchWldPriceFromBinance) {
    let wldPrice = 0.58;

    try {
        const fetchedPrice = await fetchWldPriceFromBinance();
        if (Number.isFinite(fetchedPrice) && fetchedPrice > 0) {
            wldPrice = fetchedPrice;
            console.log('[Exchange] WLD price from Binance:', wldPrice);
        }
    } catch (error) {
        console.log('[Exchange] 币安API获取价格失败，使用默认价格:', wldPrice, '错误:', error.message);
    }

    return wldPrice;
}

async function ensureBalanceRow(dbQuery, walletAddr) {
    await dbQuery(
        `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
         VALUES (?, 0, 0, NOW(), NOW())`,
        [walletAddr]
    );
}

async function getUserBalance(dbQuery, walletAddr) {
    const rows = await dbQuery(
        'SELECT usdt_balance, wld_balance FROM user_balances WHERE wallet_address = ?',
        [walletAddr]
    );
    return rows[0];
}

async function getTodayExchangedWld(dbQuery, walletAddr) {
    const rows = await dbQuery(
        `SELECT COALESCE(SUM(wld_amount), 0) as total
         FROM wld_exchange_records
         WHERE wallet_address = ? AND DATE(created_at) = CURDATE() AND direction = 'wld_to_usdt'`,
        [walletAddr]
    );

    return parseFloat(rows[0]?.total) || 0;
}

async function recordExchange(dbQuery, walletAddr, direction, wldAmount, usdtAmount, wldPrice) {
    await dbQuery(
        `INSERT INTO wld_exchange_records
         (wallet_address, direction, wld_amount, usdt_amount, price, exchange_rate, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [walletAddr, direction, wldAmount, usdtAmount, wldPrice, wldPrice]
    );
}

export function createExchangeRoutes({
    dbQuery,
    sensitiveLimiter,
    calculateUserLevel,
    ensureWldExchangeSchema,
    fetchWldPriceFromBinance
}) {
    const router = express.Router();

    router.post('/', sensitiveLimiter, async (req, res) => {
        try {
            const { wallet, direction, amount } = req.body;

            if (!wallet || !direction || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet, direction and amount are required'
                });
            }

            const walletAddr = wallet.toLowerCase();
            const exchangeAmount = parseFloat(amount);

            if (isNaN(exchangeAmount) || exchangeAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            await ensureWldExchangeSchema();

            const wldPrice = await getWldPrice(fetchWldPriceFromBinance);
            await ensureBalanceRow(dbQuery, walletAddr);

            const userBalance = await getUserBalance(dbQuery, walletAddr);
            const usdtBalance = parseFloat(userBalance.usdt_balance);
            const wldBalance = parseFloat(userBalance.wld_balance);

            if (direction === 'wld_to_usdt') {
                return exchangeWldToUsdt({
                    req,
                    res,
                    dbQuery,
                    walletAddr,
                    exchangeAmount,
                    wldBalance,
                    wldPrice,
                    calculateUserLevel
                });
            }

            if (direction === 'usdt_to_wld') {
                return exchangeUsdtToWld({
                    res,
                    dbQuery,
                    walletAddr,
                    exchangeAmount,
                    usdtBalance,
                    wldPrice
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Invalid direction. Use wld_to_usdt or usdt_to_wld'
            });
        } catch (error) {
            console.error('兑换失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Exchange failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/history', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address parameter is required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            await ensureWldExchangeSchema();

            const records = await dbQuery(
                `SELECT
                    id,
                    wallet_address,
                    COALESCE(direction, 'unknown') as direction,
                    wld_amount,
                    usdt_amount,
                    COALESCE(price, exchange_rate) as price,
                    status,
                    created_at
                 FROM wld_exchange_records
                 WHERE wallet_address = ?
                 ORDER BY created_at DESC
                 LIMIT ?`,
                [walletAddr, parseInt(limit)]
            );

            res.json({
                success: true,
                data: records
            });
        } catch (error) {
            console.error('获取兑换记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get exchange history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}

async function exchangeWldToUsdt({
    res,
    dbQuery,
    walletAddr,
    exchangeAmount,
    wldBalance,
    wldPrice,
    calculateUserLevel
}) {
    const userLevel = await calculateUserLevel(walletAddr);
    const dailyWldLimit = DAILY_WLD_LIMIT_BY_LEVEL[userLevel] || 0;

    if (dailyWldLimit === 0) {
        return res.status(400).json({
            success: false,
            message: 'You need to reach Level 1 Broker to exchange WLD to USDT. Requirements: Invite 5 members to invest, team investment > 1000 USDT'
        });
    }

    const exchangedToday = await getTodayExchangedWld(dbQuery, walletAddr);
    const remaining = dailyWldLimit - exchangedToday;

    if (exchangeAmount > remaining) {
        return res.status(400).json({
            success: false,
            message: `Daily limit exceeded. You can only exchange ${remaining.toFixed(4)} WLD today.`
        });
    }

    if (exchangeAmount > wldBalance) {
        return res.status(400).json({
            success: false,
            message: 'Insufficient WLD balance'
        });
    }

    const usdtReceived = exchangeAmount * wldPrice;
    await dbQuery(
        `UPDATE user_balances
         SET wld_balance = wld_balance - ?, usdt_balance = usdt_balance + ?
         WHERE wallet_address = ?`,
        [exchangeAmount, usdtReceived, walletAddr]
    );
    await recordExchange(dbQuery, walletAddr, 'wld_to_usdt', exchangeAmount, usdtReceived, wldPrice);

    const newBalance = await getUserBalance(dbQuery, walletAddr);
    res.json({
        success: true,
        message: 'Exchange successful',
        data: {
            direction: 'wld_to_usdt',
            wldAmount: exchangeAmount.toFixed(4),
            usdtAmount: usdtReceived.toFixed(4),
            price: wldPrice.toFixed(4),
            ...formatBalance(newBalance)
        }
    });
}

async function exchangeUsdtToWld({ res, dbQuery, walletAddr, exchangeAmount, usdtBalance, wldPrice }) {
    if (exchangeAmount > usdtBalance) {
        return res.status(400).json({
            success: false,
            message: 'Insufficient USDT balance'
        });
    }

    const wldReceived = exchangeAmount / wldPrice;
    console.log('[Exchange] USDT to WLD:', {
        exchangeAmount,
        wldPrice,
        wldReceived,
        formula: `${exchangeAmount} / ${wldPrice} = ${wldReceived}`
    });

    await dbQuery(
        `UPDATE user_balances
         SET usdt_balance = usdt_balance - ?, wld_balance = wld_balance + ?
         WHERE wallet_address = ?`,
        [exchangeAmount, wldReceived, walletAddr]
    );
    await recordExchange(dbQuery, walletAddr, 'usdt_to_wld', wldReceived, exchangeAmount, wldPrice);

    const newBalance = await getUserBalance(dbQuery, walletAddr);
    res.json({
        success: true,
        message: 'Exchange successful',
        data: {
            direction: 'usdt_to_wld',
            usdtAmount: exchangeAmount.toFixed(4),
            wldAmount: wldReceived.toFixed(4),
            price: wldPrice.toFixed(4),
            ...formatBalance(newBalance)
        }
    });
}
