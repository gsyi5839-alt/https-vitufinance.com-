import express from 'express';
import { CEX_REFERRAL_RATES, calculateLevelReward } from '../utils/referralMath.js';
import { isValidWalletAddress, normalizeWalletAddress } from '../security/index.js';
import { recordSuspiciousActivity } from '../middleware/security.js';

async function distributeQuantifyReferralRewards({ dbQuery, walletAddr, robot, robotPurchaseId, earnings }) {
    let currentWallet = walletAddr;

    for (let level = 1; level <= CEX_REFERRAL_RATES.length; level++) {
        const referrerResult = await dbQuery(
            'SELECT referrer_address FROM user_referrals WHERE wallet_address = ?',
            [currentWallet]
        );

        if (referrerResult.length === 0) {
            break;
        }

        const referrerAddress = referrerResult[0].referrer_address;
        const rewardRate = CEX_REFERRAL_RATES[level - 1];
        const rewardAmount = calculateLevelReward(earnings, rewardRate);

        await dbQuery(
            `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
             VALUES (?, 0, 0, NOW(), NOW())`,
            [referrerAddress]
        );

        await dbQuery(
            `UPDATE user_balances
             SET usdt_balance = usdt_balance + ?, updated_at = NOW()
             WHERE wallet_address = ?`,
            [rewardAmount, referrerAddress]
        );

        await dbQuery(
            `INSERT INTO referral_rewards
             (wallet_address, from_wallet, level, reward_rate, reward_amount, source_type, source_id, robot_name, source_amount, created_at)
             VALUES (?, ?, ?, ?, ?, 'quantify', ?, ?, ?, NOW())`,
            [referrerAddress, walletAddr, level, rewardRate * 100, rewardAmount, robotPurchaseId, robot.robot_name, earnings]
        );

        console.log(`[Quantify] 推荐奖励分发成功: level=${level}, to=${referrerAddress.slice(0, 10)}..., amount=${rewardAmount.toFixed(4)}`);
        currentWallet = referrerAddress;
    }
}

async function handleHighRobotQuantify({ dbQuery, res, walletAddr, robot, robotPurchaseId }) {
    if (robot.is_quantified) {
        return res.json({
            success: false,
            message: 'High robot already quantified. Profit will be returned at maturity.',
            data: {
                already_quantified: true,
                robot_type: 'high',
                expected_return: parseFloat(robot.expected_return).toFixed(4),
                end_date: robot.end_date
            }
        });
    }

    await dbQuery(
        `UPDATE robot_purchases
         SET is_quantified = 1, updated_at = NOW()
         WHERE id = ?`,
        [robotPurchaseId]
    );

    await dbQuery(
        `INSERT INTO robot_quantify_logs
         (robot_purchase_id, wallet_address, robot_name, earnings, created_at)
         VALUES (?, ?, ?, 0, NOW())`,
        [robotPurchaseId, walletAddr, robot.robot_name]
    );

    return res.json({
        success: true,
        message: 'High robot quantification started. Principal and profit will be returned at maturity.',
        data: {
            robot_type: 'high',
            earnings: '0.0000',
            expected_return: parseFloat(robot.expected_return).toFixed(4),
            end_date: robot.end_date,
            total_profit_rate: (parseFloat(robot.daily_profit) * (new Date(robot.end_date) - new Date(robot.start_date)) / (1000 * 60 * 60 * 24)).toFixed(2) + '%'
        }
    });
}

async function getActiveRobotForQuantify({ dbQuery, robotPurchaseId, walletAddr }) {
    const robots = await dbQuery(
        `SELECT * FROM robot_purchases
         WHERE id = ? AND wallet_address = ? AND status = 'active' AND end_date > CURDATE()`,
        [robotPurchaseId, walletAddr]
    );

    return robots[0] || null;
}

export function createDeprecatedRobotQuantifyRoutes({ dbQuery, quantifyLimiter }) {
    const router = express.Router();

    router.post('/robot/quantify-old-deprecated', quantifyLimiter, async (req, res) => {
        try {
            const { wallet_address, robot_purchase_id } = req.body;

            if (!wallet_address || !robot_purchase_id) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and robot_purchase_id are required'
                });
            }

            if (!isValidWalletAddress(wallet_address)) {
                recordSuspiciousActivity(req.ip, '量化：无效的钱包地址');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }

            const robotId = parseInt(robot_purchase_id, 10);
            if (isNaN(robotId) || robotId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid robot_purchase_id'
                });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const robot = await getActiveRobotForQuantify({ dbQuery, robotPurchaseId: robot_purchase_id, walletAddr });

            if (!robot) {
                const expiredCheck = await dbQuery(
                    `SELECT end_date FROM robot_purchases
                     WHERE id = ? AND wallet_address = ? AND status = 'active' AND end_date = CURDATE()`,
                    [robot_purchase_id, walletAddr]
                );

                if (expiredCheck.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: '机器人今天到期，无法继续量化。本金将在明天自动返还。'
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Robot not found or expired'
                });
            }

            const robotType = robot.robot_type || 'cex';
            if (robotType === 'high') {
                return handleHighRobotQuantify({ dbQuery, res, walletAddr, robot, robotPurchaseId: robot_purchase_id });
            }

            const lastQuantify = await dbQuery(
                `SELECT created_at FROM robot_quantify_logs
                 WHERE robot_purchase_id = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [robot_purchase_id]
            );

            if (lastQuantify.length > 0) {
                const lastTime = new Date(lastQuantify[0].created_at);
                const hoursDiff = (new Date() - lastTime) / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    const nextQuantifyTime = new Date(lastTime.getTime() + 24 * 60 * 60 * 1000);
                    const hoursRemaining = 24 - hoursDiff;
                    const minutesRemaining = Math.floor((hoursRemaining % 1) * 60);

                    return res.json({
                        success: false,
                        message: `距离下次量化还需等待 ${Math.floor(hoursRemaining)} 小时 ${minutesRemaining} 分钟`,
                        data: {
                            already_quantified: true,
                            next_quantify_time: nextQuantifyTime.toISOString(),
                            hours_remaining: hoursRemaining.toFixed(2),
                            last_quantify_time: lastTime.toISOString()
                        }
                    });
                }
            }

            const earnings = parseFloat(robot.price) * (parseFloat(robot.daily_profit) / 100);
            await dbQuery(
                `INSERT INTO robot_quantify_logs
                 (robot_purchase_id, wallet_address, robot_name, earnings, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [robot_purchase_id, walletAddr, robot.robot_name, earnings]
            );
            await dbQuery(
                `UPDATE robot_purchases
                 SET total_profit = total_profit + ?, updated_at = NOW()
                 WHERE id = ?`,
                [earnings, robot_purchase_id]
            );
            await dbQuery(
                `UPDATE user_balances
                 SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                 WHERE wallet_address = ?`,
                [earnings, walletAddr]
            );
            await dbQuery(
                `INSERT INTO robot_earnings
                 (wallet_address, robot_purchase_id, robot_name, earning_amount, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [walletAddr, robot_purchase_id, robot.robot_name, earnings]
            );

            try {
                await distributeQuantifyReferralRewards({ dbQuery, walletAddr, robot, robotPurchaseId: robot_purchase_id, earnings });
            } catch (referralError) {
                console.error('[Quantify] 推荐奖励分发失败（不影响用户量化）:', referralError.message);
            }

            const updatedRobot = await dbQuery(
                'SELECT * FROM robot_purchases WHERE id = ?',
                [robot_purchase_id]
            );
            const updatedBalance = await dbQuery(
                'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                message: 'Quantification successful',
                data: {
                    robot_type: robotType,
                    earnings: earnings.toFixed(4),
                    total_profit: parseFloat(updatedRobot[0].total_profit).toFixed(4),
                    new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4)
                }
            });
        } catch (error) {
            console.error('量化操作失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Quantification failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/robot/quantify-status-old-deprecated', async (req, res) => {
        try {
            const { wallet_address, robot_purchase_id } = req.query;

            if (!wallet_address || !robot_purchase_id) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and robot_purchase_id are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const robots = await dbQuery(
                'SELECT robot_type, is_quantified, expected_return, end_date FROM robot_purchases WHERE id = ? AND wallet_address = ?',
                [robot_purchase_id, walletAddr]
            );

            if (robots.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Robot not found'
                });
            }

            const robot = robots[0];
            const robotType = robot.robot_type || 'cex';

            if (robotType === 'high') {
                return res.json({
                    success: true,
                    data: {
                        robot_type: 'high',
                        quantified_today: robot.is_quantified === 1,
                        is_quantified: robot.is_quantified === 1,
                        expected_return: parseFloat(robot.expected_return).toFixed(4),
                        end_date: robot.end_date
                    }
                });
            }

            const endDate = new Date(robot.end_date);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (endDate.getTime() <= todayDate.getTime()) {
                return res.json({
                    success: true,
                    data: {
                        robot_type: robotType,
                        quantified_today: true,
                        is_expired: true,
                        message: '机器人今天到期，无法继续量化'
                    }
                });
            }

            const lastQuantify = await dbQuery(
                `SELECT id, earnings, created_at FROM robot_quantify_logs
                 WHERE robot_purchase_id = ? AND wallet_address = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [robot_purchase_id, walletAddr]
            );

            let canQuantify = true;
            let nextQuantifyTime = null;
            let hoursRemaining = 0;
            let lastQuantifyTime = null;

            if (lastQuantify.length > 0) {
                const lastTime = new Date(lastQuantify[0].created_at);
                const hoursDiff = (new Date() - lastTime) / (1000 * 60 * 60);
                lastQuantifyTime = lastTime.toISOString();

                if (hoursDiff < 24) {
                    canQuantify = false;
                    nextQuantifyTime = new Date(lastTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
                    hoursRemaining = 24 - hoursDiff;
                }
            }

            res.json({
                success: true,
                data: {
                    robot_type: robotType,
                    quantified_today: !canQuantify,
                    can_quantify: canQuantify,
                    is_expired: false,
                    next_quantify_time: nextQuantifyTime,
                    hours_remaining: hoursRemaining > 0 ? hoursRemaining.toFixed(2) : 0,
                    last_quantify_time: lastQuantifyTime,
                    record: lastQuantify.length > 0 ? lastQuantify[0] : null
                }
            });
        } catch (error) {
            console.error('检查量化状态失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to check quantify status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
