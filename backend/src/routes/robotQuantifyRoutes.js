import express from 'express';
import { quantifyLimiter } from '../middleware/security.js';
import {
    getRobotConfig,
    calculateQuantifyEarnings,
    checkQuantifyStatus,
    isRobotExpired,
    SAFETY_LIMITS
} from '../config/robotConfig.js';
import {
    formatDateTime,
    getDbQuery,
    isValidWalletAddress,
    normalizeWalletAddress
} from '../services/robotContext.js';
import { distributeReferralRewards } from '../services/robotReferralService.js';

const router = express.Router();

router.post('/api/robot/quantify', quantifyLimiter, async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address, robot_purchase_id } = req.body;

        if (!wallet_address || !robot_purchase_id) {
            return res.status(400).json({
                success: false,
                message: 'wallet_address and robot_purchase_id are required'
            });
        }

        if (!isValidWalletAddress(wallet_address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet address format'
            });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        const robotId = parseInt(robot_purchase_id, 10);

        if (isNaN(robotId) || robotId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid robot_purchase_id'
            });
        }

        const userStatus = await dbQuery(
            'SELECT is_banned FROM user_balances WHERE wallet_address = ?',
            [walletAddr]
        );
        if (userStatus.length > 0 && userStatus[0].is_banned === 1) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact support.'
            });
        }

        const robots = await dbQuery(
            `SELECT * FROM robot_purchases
             WHERE id = ? AND wallet_address = ? AND status = 'active' AND end_time > NOW()`,
            [robotId, walletAddr]
        );

        if (robots.length === 0) {
            const expiredRobot = await dbQuery(
                `SELECT end_time FROM robot_purchases
                 WHERE id = ? AND wallet_address = ? AND status = 'active' AND end_time <= NOW()`,
                [robotId, walletAddr]
            );

            if (expiredRobot.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '机器人已到期，无法继续量化',
                    data: { expired: true, end_time: expiredRobot[0].end_time }
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Robot not found or already expired'
            });
        }

        const robot = robots[0];
        const config = getRobotConfig(robot.robot_name);

        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'Robot configuration not found'
            });
        }

        const quantifyStatus = checkQuantifyStatus(robot, new Date());
        if (!quantifyStatus.canQuantify) {
            return res.json({
                success: false,
                message: quantifyStatus.reason,
                data: {
                    already_quantified: true,
                    next_quantify_time: quantifyStatus.nextQuantifyTime ? formatDateTime(quantifyStatus.nextQuantifyTime) : null,
                    hours_remaining: quantifyStatus.hoursRemaining ? quantifyStatus.hoursRemaining.toFixed(2) : null
                }
            });
        }

        if (config.single_quantify) {
            await dbQuery(
                `UPDATE robot_purchases
                 SET is_quantified = 1, last_quantify_time = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [robotId]
            );

            console.log(`[Quantify] ${robot.robot_type.toUpperCase()} robot ${robot.robot_name} quantified by ${walletAddr.slice(0, 10)}..., expected_return=${robot.expected_return}`);

            return res.json({
                success: true,
                message: 'Quantification completed! Principal and profit will be returned at maturity.',
                data: {
                    earnings: '0.0000',
                    robot_type: robot.robot_type,
                    is_quantified: true,
                    expected_return: parseFloat(robot.expected_return).toFixed(4),
                    end_time: robot.end_time
                }
            });
        }

        let earnings = calculateQuantifyEarnings(robot.robot_name, parseFloat(robot.price));
        const absoluteMaxEarnings = SAFETY_LIMITS.MAX_SINGLE_EARNING || 2500;
        if (earnings > absoluteMaxEarnings) {
            console.warn(`[Quantify Security] Earnings ${earnings} exceeds config max ${absoluteMaxEarnings}, capping`);
            earnings = absoluteMaxEarnings;
        }

        if (earnings > SAFETY_LIMITS.EARNING_WARNING_THRESHOLD) {
            console.log(`[Quantify] High earnings: ${robot.robot_name}, amount=${earnings.toFixed(2)} USDT`);
        }

        const quantifyInsertResult = await dbQuery(
            `INSERT INTO robot_quantify_logs
             (robot_purchase_id, wallet_address, robot_name, earnings, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [robotId, walletAddr, robot.robot_name, earnings]
        );
        const quantifyLogId = quantifyInsertResult?.insertId;

        await dbQuery(
            `UPDATE robot_purchases
             SET total_profit = total_profit + ?,
                 is_quantified = TRUE,
                 quantify_count = quantify_count + 1,
                 last_quantify_time = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [earnings, robotId]
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
            [walletAddr, robotId, robot.robot_name, earnings]
        );

        if (robot.robot_type === 'cex' || robot.robot_type === 'grid') {
            await distributeReferralRewards(walletAddr, robot, earnings, {
                sourceType: 'quantify',
                sourceId: quantifyLogId || 0
            });
            console.log(`[Quantify] Referral rewards distributed for robot ${robotId}, profit: ${earnings.toFixed(4)} USDT`);
        }

        const updatedRobot = await dbQuery(
            'SELECT total_profit FROM robot_purchases WHERE id = ?',
            [robotId]
        );
        const updatedBalance = await dbQuery(
            'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
            [walletAddr]
        );

        console.log(`[Quantify] ${robot.robot_name} quantified by ${walletAddr.slice(0, 10)}..., earnings: ${earnings.toFixed(4)} USDT`);

        res.json({
            success: true,
            message: 'Quantification completed!',
            data: {
                earnings: earnings.toFixed(4),
                total_profit: parseFloat(updatedRobot[0].total_profit).toFixed(4),
                new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4),
                robot_type: robot.robot_type
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

router.get('/api/robot/quantify-status', async (req, res) => {
    const dbQuery = getDbQuery();

    try {
        const { wallet_address, robot_purchase_id } = req.query;

        if (!wallet_address || !robot_purchase_id) {
            return res.status(400).json({
                success: false,
                message: 'wallet_address and robot_purchase_id are required'
            });
        }

        const walletAddr = normalizeWalletAddress(wallet_address);
        const userStatus = await dbQuery(
            'SELECT is_banned FROM user_balances WHERE wallet_address = ?',
            [walletAddr]
        );
        if (userStatus.length > 0 && Number(userStatus[0].is_banned) === 1) {
            return res.json({
                success: true,
                data: {
                    can_quantify: false,
                    reason: 'Your account has been suspended. Quantification is disabled. Please contact support.',
                    quantified_today: true,
                    is_quantified: false,
                    next_quantify_time: null,
                    hours_remaining: 0,
                    last_quantify_time: null,
                    end_time: null,
                    is_expired: false
                }
            });
        }

        const robots = await dbQuery(
            'SELECT * FROM robot_purchases WHERE id = ? AND wallet_address = ?',
            [robot_purchase_id, walletAddr]
        );

        if (robots.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Robot not found'
            });
        }

        const robot = robots[0];
        const currentTime = new Date();
        const quantifyStatus = checkQuantifyStatus(robot, currentTime);

        res.json({
            success: true,
            data: {
                can_quantify: quantifyStatus.canQuantify,
                reason: quantifyStatus.reason,
                quantified_today: !quantifyStatus.canQuantify,
                is_quantified: robot.is_quantified === 1,
                next_quantify_time: quantifyStatus.nextQuantifyTime ? formatDateTime(quantifyStatus.nextQuantifyTime) : null,
                hours_remaining: quantifyStatus.hoursRemaining ? parseFloat(quantifyStatus.hoursRemaining.toFixed(2)) : 0,
                last_quantify_time: robot.last_quantify_time,
                end_time: robot.end_time,
                is_expired: isRobotExpired(robot, currentTime)
            }
        });
    } catch (error) {
        console.error('查询量化状态失败:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to check quantify status'
        });
    }
});

export default router;
