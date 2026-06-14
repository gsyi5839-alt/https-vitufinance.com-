import express from 'express';

function getRobotConfig(robotName) {
    const configs = {
        'Binance Ai Bot': { robot_id: 'binance_01', duration_days: 1, daily_profit: 2.0, robot_type: 'cex' },
        'Coinbase Ai Bot': { robot_id: 'coinbase_01', duration_days: 3, daily_profit: 2.0, robot_type: 'cex' },
        'OKX Ai Bot': { robot_id: 'okx_01', duration_days: 2, daily_profit: 2.0, robot_type: 'cex' },
        'Bybit Ai Bot': { robot_id: 'bybit_01', duration_days: 7, daily_profit: 1.5, robot_type: 'cex' },
        'Upbit Ai Bot': { robot_id: 'upbit_01', duration_days: 15, daily_profit: 1.8, robot_type: 'cex' },
        'Bitfinex Ai Bot': { robot_id: 'bitfinex_01', duration_days: 30, daily_profit: 2.0, robot_type: 'cex' },
        'Kucoin Ai Bot': { robot_id: 'kucoin_01', duration_days: 45, daily_profit: 2.2, robot_type: 'cex' },
        'Bitget Ai Bot': { robot_id: 'bitget_01', duration_days: 90, daily_profit: 2.5, robot_type: 'cex' },
        'Gate Ai Bot': { robot_id: 'gate_01', duration_days: 120, daily_profit: 3.0, robot_type: 'cex' },
        'Binance Ai Bot-01': { robot_id: 'binance_02', duration_days: 180, daily_profit: 4.2, robot_type: 'cex' },
        'PancakeSwap Ai Bot': { robot_id: 'pancake_01', duration_days: 30, daily_profit: 1.8, robot_type: 'dex' },
        'Uniswap Ai Bot': { robot_id: 'uniswap_01', duration_days: 30, daily_profit: 2.0, robot_type: 'dex' },
        'BaseSwap Ai Bot': { robot_id: 'baseswap_01', duration_days: 30, daily_profit: 2.2, robot_type: 'dex' },
        'SushiSwap Ai Bot': { robot_id: 'sushiswap_01', duration_days: 60, daily_profit: 2.5, robot_type: 'dex' },
        'Jupiter Ai Bot': { robot_id: 'jupiter_01', duration_days: 60, daily_profit: 2.8, robot_type: 'dex' },
        'Curve Ai Bot': { robot_id: 'curve_01', duration_days: 30, daily_profit: 3.5, robot_type: 'dex' },
        'DODO Ai Bot': { robot_id: 'dodo_01', duration_days: 30, daily_profit: 4.0, robot_type: 'dex' },
        'Binance Grid Bot-M1': { robot_id: 'grid_m1', duration_days: 120, daily_profit: 1.5, robot_type: 'grid' },
        'Binance Grid Bot-M2': { robot_id: 'grid_m2', duration_days: 150, daily_profit: 1.6, robot_type: 'grid' },
        'Binance Grid Bot-M3': { robot_id: 'grid_m3', duration_days: 180, daily_profit: 1.7, robot_type: 'grid' },
        'Binance Grid Bot-M4': { robot_id: 'grid_m4', duration_days: 210, daily_profit: 1.8, robot_type: 'grid' },
        'Binance Grid Bot-M5': { robot_id: 'grid_m5', duration_days: 240, daily_profit: 2.0, robot_type: 'grid' },
        'Binance High Robot-H1': { robot_id: 'high_h1', duration_days: 1, daily_profit: 1.2, robot_type: 'high' },
        'Binance High Robot-H2': { robot_id: 'high_h2', duration_days: 3, daily_profit: 1.3, robot_type: 'high' },
        'Binance High Robot-H3': { robot_id: 'high_h3', duration_days: 5, daily_profit: 1.4, robot_type: 'high' }
    };

    return configs[robotName] || { robot_id: 'unknown', duration_days: 30, daily_profit: 1.0, robot_type: 'cex' };
}

export function createDeprecatedRobotPurchaseRoutes({ dbQuery }) {
    const router = express.Router();

    router.post('/robot/purchase-old-deprecated', async (req, res) => {
        try {
            const { wallet_address, robot_name, price } = req.body;

            if (!wallet_address || !robot_name || !price) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address, robot_name, and price are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const robotPrice = parseFloat(price);

            if (isNaN(robotPrice) || robotPrice <= 0) {
                return res.status(400).json({ success: false, message: 'Invalid price' });
            }

            const userBalance = await dbQuery(
                'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            if (userBalance.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet address not found. Please deposit first.'
                });
            }

            const currentBalance = parseFloat(userBalance[0].usdt_balance);
            if (currentBalance < robotPrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient USDT balance',
                    data: {
                        current_balance: currentBalance.toFixed(4),
                        required: robotPrice.toFixed(4)
                    }
                });
            }

            const robotConfig = getRobotConfig(robot_name);
            if (robotConfig.robot_type === 'grid' || robotConfig.robot_type === 'high') {
                const todayPurchases = await dbQuery(
                    `SELECT id FROM robot_purchases
                     WHERE wallet_address = ? AND robot_name = ? AND DATE(created_at) = CURDATE()`,
                    [walletAddr, robot_name]
                );

                if (todayPurchases.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'You can only purchase one of this robot per day',
                        data: { daily_limit_reached: true }
                    });
                }
            }

            let expectedReturn = 0;
            if (robotConfig.robot_type === 'high') {
                const totalProfitRate = (robotConfig.daily_profit / 100) * robotConfig.duration_days;
                expectedReturn = robotPrice * (1 + totalProfitRate);
            }

            await dbQuery(
                'UPDATE user_balances SET usdt_balance = usdt_balance - ?, updated_at = NOW() WHERE wallet_address = ?',
                [robotPrice, walletAddr]
            );

            await dbQuery(
                `INSERT INTO robot_purchases
                 (wallet_address, robot_id, robot_name, robot_type, price, token, status, start_date, end_date, daily_profit, total_profit, is_quantified, expected_return, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'USDT', 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 0, 0, ?, NOW(), NOW())`,
                [walletAddr, robotConfig.robot_id, robot_name, robotConfig.robot_type, robotPrice, robotConfig.duration_days, robotConfig.daily_profit, expectedReturn]
            );

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                message: `Successfully purchased ${robot_name}`,
                data: {
                    robot_name,
                    robot_type: robotConfig.robot_type,
                    price: robotPrice.toFixed(4),
                    duration_days: robotConfig.duration_days,
                    daily_profit: robotConfig.daily_profit,
                    expected_return: expectedReturn.toFixed(4),
                    new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4)
                }
            });
        } catch (error) {
            console.error('购买机器人失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Purchase failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
