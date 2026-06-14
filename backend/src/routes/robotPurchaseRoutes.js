import express from 'express';
import { sensitiveLimiter } from '../middleware/security.js';
import {
    getRobotConfig,
    calculateEndTime,
    calculateHighRobotReturn,
    hoursToDays
} from '../config/robotConfig.js';
import { MIN_ROBOT_PURCHASE, processUplineDailyDividends } from '../cron/teamDividendCron.js';
import {
    formatDateTime,
    getDbQuery,
    isValidWalletAddress,
    normalizeWalletAddress
} from '../services/robotContext.js';
import { distributeDexPurchaseRewards } from '../services/robotReferralService.js';

const router = express.Router();

router.post('/api/robot/purchase', sensitiveLimiter, async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address, robot_name, price } = req.body;

        if (!wallet_address || !robot_name || !price) {
            return res.status(400).json({
                success: false,
                message: 'wallet_address, robot_name, and price are required'
            });
        }

        if (!isValidWalletAddress(wallet_address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet address format'
            });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        const robotPrice = parseFloat(price);

        if (isNaN(robotPrice) || robotPrice <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid price' });
        }

        const config = getRobotConfig(robot_name);
        if (!config) {
            return res.status(400).json({
                success: false,
                message: `Unknown robot: ${robot_name}`
            });
        }

        if (config.robot_type === 'high' && (robotPrice < config.min_price || robotPrice > config.max_price)) {
            return res.status(400).json({
                success: false,
                message: `Price must be between ${config.min_price} and ${config.max_price} USDT`,
                data: { min_price: config.min_price, max_price: config.max_price }
            });
        }

        const userBalance = await dbQuery(
            'SELECT usdt_balance, is_banned FROM user_balances WHERE wallet_address = ?',
            [walletAddr]
        );

        if (userBalance.length > 0 && userBalance[0].is_banned === 1) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact support.'
            });
        }

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

        if (config.daily_limit) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayPurchases = await dbQuery(
                `SELECT id FROM robot_purchases
                 WHERE LOWER(wallet_address) = LOWER(?) AND robot_id = ? AND created_at >= ?`,
                [walletAddr, config.robot_id, formatDateTime(today)]
            );

            if (todayPurchases.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'You can only purchase one of this robot per day',
                    data: { daily_limit_reached: true }
                });
            }
        }

        if (!config.daily_limit && config.limit) {
            const purchaseCount = await dbQuery(
                `SELECT COUNT(*) as count FROM robot_purchases
                 WHERE LOWER(wallet_address) = LOWER(?) AND robot_id = ? AND status = 'active' AND end_time > NOW()`,
                [walletAddr, config.robot_id]
            );

            if (purchaseCount[0].count >= config.limit) {
                return res.status(400).json({
                    success: false,
                    message: `Purchase limit reached (${config.limit})`,
                    data: { limit_reached: true, limit: config.limit }
                });
            }
        }

        if (config.arbitrage_orders) {
            const totalPurchaseCount = await dbQuery(
                `SELECT COUNT(*) as count FROM robot_purchases
                 WHERE LOWER(wallet_address) = LOWER(?) AND robot_id = ?`,
                [walletAddr, config.robot_id]
            );

            if (totalPurchaseCount[0].count >= config.arbitrage_orders) {
                return res.status(400).json({
                    success: false,
                    message: `Arbitrage order limit reached. You can only open this robot ${config.arbitrage_orders} times.`,
                    data: {
                        arbitrage_limit_reached: true,
                        arbitrage_orders: config.arbitrage_orders,
                        current_count: totalPurchaseCount[0].count,
                        robot_id: config.robot_id
                    }
                });
            }
        }

        const startTime = new Date();
        const endTime = calculateEndTime(robot_name, startTime);
        let expectedReturn = 0;

        if (config.robot_type === 'high') {
            expectedReturn = calculateHighRobotReturn(robot_name, robotPrice);
        } else if (config.robot_type === 'dex') {
            const days = config.duration_hours / 24;
            const totalProfit = robotPrice * (config.daily_profit / 100) * days;
            expectedReturn = robotPrice + totalProfit;
            console.log(`[Purchase] DEX robot ${robot_name}: price=${robotPrice}, days=${days}, daily_profit=${config.daily_profit}%, expected_return=${expectedReturn.toFixed(4)}`);
        }

        const deductResult = await dbQuery(
            `UPDATE user_balances
             SET usdt_balance = usdt_balance - ?, updated_at = NOW()
             WHERE wallet_address = ? AND usdt_balance >= ?`,
            [robotPrice, walletAddr, robotPrice]
        );

        if (!deductResult || deductResult.affectedRows === 0) {
            const recheckBalance = await dbQuery(
                'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            const actualBalance = recheckBalance.length > 0 ? parseFloat(recheckBalance[0].usdt_balance) : 0;
            console.warn(`[Purchase] REJECTED - Insufficient balance: wallet=${walletAddr.slice(0, 10)}..., balance=${actualBalance.toFixed(4)}, required=${robotPrice.toFixed(4)}`);

            return res.status(400).json({
                success: false,
                message: 'Insufficient USDT balance. Please deposit more funds.',
                data: {
                    current_balance: actualBalance.toFixed(4),
                    required: robotPrice.toFixed(4),
                    shortfall: (robotPrice - actualBalance).toFixed(4)
                }
            });
        }

        console.log(`[Purchase] Balance deducted: wallet=${walletAddr.slice(0, 10)}..., amount=${robotPrice.toFixed(4)}`);

        const purchaseResult = await dbQuery(
            `INSERT INTO robot_purchases
             (wallet_address, robot_id, robot_name, robot_type, price, token, status,
              start_date, end_date, start_time, end_time, duration_hours,
              quantify_interval_hours, daily_profit, total_profit, is_quantified,
              expected_return, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'USDT', 'active',
                     DATE(?), DATE(?), ?, ?, ?,
                     ?, ?, 0, 0,
                     ?, NOW(), NOW())`,
            [
                walletAddr,
                config.robot_id,
                robot_name,
                config.robot_type,
                robotPrice,
                formatDateTime(startTime),
                formatDateTime(endTime),
                formatDateTime(startTime),
                formatDateTime(endTime),
                config.duration_hours,
                config.quantify_interval_hours,
                config.daily_profit,
                expectedReturn
            ]
        );
        const robotPurchaseId = purchaseResult?.insertId || null;

        if (robotPrice >= MIN_ROBOT_PURCHASE) {
            setImmediate(() => {
                processUplineDailyDividends(walletAddr, 8)
                    .then((result) => {
                        if (result?.rewarded > 0) {
                            console.log(`[TeamCron] Purchase-triggered dividends: trigger=${walletAddr.slice(0, 10)}..., rewarded=${result.rewarded}`);
                        }
                    })
                    .catch((error) => {
                        console.error(`[TeamCron] Purchase-triggered dividend failed for ${walletAddr.slice(0, 10)}...:`, error.message);
                    });
            });
        }

        const updatedBalance = await dbQuery(
            'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
            [walletAddr]
        );

        if (config.robot_type === 'dex') {
            await distributeDexPurchaseRewards(walletAddr, robot_name, robotPrice, robotPurchaseId);
        }

        res.json({
            success: true,
            message: `Successfully purchased ${robot_name}`,
            data: {
                robot_name,
                robot_type: config.robot_type,
                price: robotPrice.toFixed(4),
                duration_hours: config.duration_hours,
                duration_days: hoursToDays(config.duration_hours),
                daily_profit: config.daily_profit,
                quantify_interval_hours: config.quantify_interval_hours,
                start_time: formatDateTime(startTime),
                end_time: formatDateTime(endTime),
                expected_return: expectedReturn.toFixed(4),
                new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4)
            }
        });

        console.log(`[Purchase] ${robot_name} purchased by ${walletAddr.slice(0, 10)}... for ${robotPrice} USDT, ends at ${formatDateTime(endTime)}`);
    } catch (error) {
        console.error('购买机器人失败:', error.message);
        res.status(500).json({
            success: false,
            message: 'Purchase failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
