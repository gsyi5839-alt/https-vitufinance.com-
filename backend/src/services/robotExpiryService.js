import { getRobotConfig } from '../config/robotConfig.js';
import {
    normalizeWalletAddress as normalizeWalletLower,
    creditUsdtBalance,
    ensureUserBalanceRow
} from '../utils/userBalanceUtils.js';
import { getDbQuery } from './robotContext.js';
import { distributeReferralRewards } from './robotReferralService.js';

export async function processExpiredRobots(walletAddr, robotTypes = ['cex', 'dex', 'grid', 'high']) {
    const dbQuery = getDbQuery();

    try {
        const normalizedWallet = normalizeWalletLower(walletAddr) || walletAddr;
        walletAddr = normalizedWallet;

        const typePlaceholders = robotTypes.map(() => '?').join(',');
        const expiredRobots = await dbQuery(
            `SELECT * FROM robot_purchases
             WHERE LOWER(wallet_address) = LOWER(?)
             AND robot_type IN (${typePlaceholders})
             AND status = 'active'
             AND end_time <= NOW()
             AND (expired_at IS NULL)`,
            [walletAddr, ...robotTypes]
        );

        for (const robot of expiredRobots) {
            await processOneExpiredRobot(robot, walletAddr);
        }

        if (expiredRobots.length > 0) {
            console.log(`[Expire] Processed ${expiredRobots.length} expired robots for ${walletAddr.slice(0, 10)}...`);
        }
    } catch (error) {
        console.error('处理到期机器人失败:', error.message);
    }
}

async function processOneExpiredRobot(robot, walletAddr) {
    const dbQuery = getDbQuery();
    let refundCredited = false;

    try {
        const claimResult = await dbQuery(
            `UPDATE robot_purchases
             SET expired_at = NOW(), updated_at = NOW()
             WHERE id = ? AND status = 'active' AND expired_at IS NULL`,
            [robot.id]
        );
        if (!claimResult || claimResult.affectedRows === 0) {
            return;
        }

        const config = getRobotConfig(robot.robot_name);
        if (!config) {
            console.error(`Robot config not found: ${robot.robot_name}`);
            await dbQuery(
                'UPDATE robot_purchases SET expired_at = NULL, updated_at = NOW() WHERE id = ? AND status = \'active\'',
                [robot.id]
            );
            return;
        }

        let returnAmount = 0;
        let profitAmount = 0;

        if (robot.robot_type === 'high' || robot.robot_type === 'dex') {
            if (robot.is_quantified === 1) {
                returnAmount = parseFloat(robot.expected_return) || parseFloat(robot.price);
                profitAmount = returnAmount - parseFloat(robot.price);
            } else {
                returnAmount = parseFloat(robot.price);
                profitAmount = 0;
            }

            console.log(`[Expire] ${robot.robot_type.toUpperCase()} robot ${robot.id}: principal=${robot.price}, profit=${profitAmount.toFixed(4)}, total=${returnAmount.toFixed(4)}`);
        } else if (config.return_principal) {
            returnAmount = parseFloat(robot.price);
        }

        if (returnAmount > 0) {
            await ensureUserBalanceRow(dbQuery, walletAddr);
            await creditUsdtBalance(dbQuery, walletAddr, returnAmount);
            refundCredited = true;

            const isReturnWithProfit = (robot.robot_type === 'high' || robot.robot_type === 'dex') && robot.is_quantified === 1;
            const txDescription = isReturnWithProfit
                ? `${robot.robot_name} 到期返还（本金+收益） #robot_purchase_id=${robot.id}`
                : `${robot.robot_name} 到期返还本金 #robot_purchase_id=${robot.id}`;

            try {
                await dbQuery(
                    `INSERT INTO transaction_history
                     (wallet_address, tx_type, amount, currency, description, status, created_at)
                     VALUES (?, 'refund', ?, 'USDT', ?, 'completed', NOW())`,
                    [walletAddr, returnAmount, txDescription]
                );
            } catch (logErr) {
                console.error('[Expire] Failed to write transaction_history (refund already credited):', logErr.message);
            }

            console.log(`[Expire] Returned ${returnAmount.toFixed(4)} USDT to ${walletAddr.slice(0, 10)}... for robot ${robot.id} (${robot.robot_name})`);
        }

        try {
            await dbQuery(
                `UPDATE robot_purchases
                 SET status = 'expired', total_profit = ?, updated_at = NOW()
                 WHERE id = ?`,
                [(robot.robot_type === 'high' || robot.robot_type === 'dex') ? profitAmount : robot.total_profit, robot.id]
            );
        } catch (statusErr) {
            console.error('[Expire] Failed to update robot status after expiry processing:', statusErr.message);
        }

        if ((robot.robot_type === 'high' || robot.robot_type === 'dex') && profitAmount > 0) {
            try {
                await dbQuery(
                    `INSERT INTO robot_earnings
                     (wallet_address, robot_purchase_id, robot_name, earning_amount, created_at)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [walletAddr, robot.id, robot.robot_name, profitAmount]
                );
            } catch (earnErr) {
                console.error('[Expire] Failed to write robot_earnings (refund state preserved):', earnErr.message);
            }

            try {
                await distributeReferralRewards(walletAddr, robot, profitAmount, {
                    sourceType: 'maturity',
                    sourceId: robot.id
                });
            } catch (refErr) {
                console.error('[Expire] Failed to distribute referral rewards (refund state preserved):', refErr.message);
            }
            console.log(`[Expire] ${robot.robot_type.toUpperCase()} robot ${robot.id} earnings recorded, referral rewards distributed based on profit ${profitAmount.toFixed(4)} USDT`);
        }
    } catch (error) {
        console.error(`处理到期机器人 ${robot.id} 失败:`, error.message);
        try {
            if (!refundCredited) {
                await dbQuery(
                    'UPDATE robot_purchases SET expired_at = NULL, updated_at = NOW() WHERE id = ? AND status = \'active\'',
                    [robot.id]
                );
            }
        } catch {
            // Best-effort unlock.
        }
    }
}

export async function processAllExpiredRobots() {
    const dbQuery = getDbQuery();

    try {
        const wallets = await dbQuery(
            `SELECT DISTINCT wallet_address FROM robot_purchases
             WHERE status = 'active' AND end_time <= NOW()`
        );

        console.log(`[Cron] Processing expired robots for ${wallets.length} wallets...`);

        for (const { wallet_address } of wallets) {
            await processExpiredRobots(wallet_address);
        }

        console.log('[Cron] Expired robots processing completed');
    } catch (error) {
        console.error('[Cron] Failed to process expired robots:', error.message);
    }
}
