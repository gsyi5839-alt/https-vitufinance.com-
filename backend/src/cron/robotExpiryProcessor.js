import { getRobotConfig } from '../config/robotConfig.js';
import {
    normalizeWalletAddress,
    creditUsdtBalance,
    creditFrozenUsdtBalance,
    ensureUserBalanceRow
} from '../utils/userBalanceUtils.js';
import {
    getDbQuery,
    formatDateTime,
    isValidWalletAddress
} from './robotExpiryState.js';
import { distributeReferralRewards } from './robotExpiryRewards.js';

async function processAllExpiredRobots() {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        console.error('[Cron] Database query function not set');
        return { success: false, error: 'Database not configured' };
    }

    const startTime = new Date();
    console.log(`[Cron] Starting expired robots processing at ${formatDateTime(startTime)}`);

    let processed = 0;
    let failed = 0;
    let totalReturned = 0;

    try {
        const expiredRobots = await dbQuery(
            `SELECT * FROM robot_purchases
            WHERE status = 'active' AND end_time <= NOW() AND (expired_at IS NULL)
            ORDER BY end_time ASC`
        );

        console.log(`[Cron] Found ${expiredRobots.length} expired robots to process`);

        for (const robot of expiredRobots) {
            try {
                const result = await processExpiredRobot(robot);
                if (result.success) {
                    processed++;
                    totalReturned += result.returnAmount || 0;
                } else {
                    failed++;
                    console.error(`[Cron] Failed to process robot ${robot.id}: ${result.error}`);
                }
            } catch (error) {
                failed++;
                console.error(`[Cron] Error processing robot ${robot.id}:`, error.message);
            }
        }

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log(`[Cron] Completed in ${duration.toFixed(2)}s: processed=${processed}, failed=${failed}, totalReturned=${totalReturned.toFixed(4)} USDT`);

        return {
            success: true,
            processed,
            failed,
            totalReturned,
            duration
        };
    } catch (error) {
        console.error('[Cron] Fatal error:', error.message);
        return { success: false, error: error.message };
    }
}

async function processExpiredRobot(robot) {
    const dbQuery = getDbQuery();
    const walletAddr = normalizeWalletAddress(robot.wallet_address);
    if (!walletAddr || !isValidWalletAddress(walletAddr)) {
        return { success: false, error: 'Invalid wallet address' };
    }

    const claimResult = await dbQuery(
        `UPDATE robot_purchases
         SET expired_at = NOW(), updated_at = NOW()
         WHERE id = ? AND status = 'active' AND expired_at IS NULL`,
        [robot.id]
    );
    if (!claimResult || claimResult.affectedRows === 0) {
        return { success: true, returnAmount: 0, skipped: true, reason: 'already_claimed' };
    }

    const userStatus = await dbQuery(
        'SELECT is_banned FROM user_balances WHERE wallet_address = ?',
        [walletAddr]
    );
    const isBannedUser = userStatus.length > 0 && Number(userStatus[0].is_banned) === 1;
    const config = getRobotConfig(robot.robot_name);

    if (!config) {
        await releaseExpiryClaim(robot.id);
        return { success: false, error: 'Config not found' };
    }

    let returnAmount = 0;
    let profitAmount = 0;
    let refundCredited = false;

    try {
        ({ returnAmount, profitAmount } = calculateMaturityReturn(robot, config));

        const priceAmount = parseFloat(robot.price) || 0;
        const principalReturn = isBannedUser && returnAmount > 0
            ? Math.max(0, Math.min(priceAmount, returnAmount))
            : 0;
        const frozenProfitReturn = isBannedUser && returnAmount > 0
            ? Math.max(0, returnAmount - principalReturn)
            : 0;

        if (returnAmount > 0) {
            await creditMaturityReturn({
                walletAddr,
                robot,
                returnAmount,
                principalReturn,
                frozenProfitReturn,
                isBannedUser
            });
            refundCredited = true;
        }

        await markRobotExpired(robot.id, robot.robot_type, profitAmount);

        if (!isBannedUser && (robot.robot_type === 'high' || robot.robot_type === 'dex') && profitAmount > 0) {
            await writeProfitAndRewards(walletAddr, robot, profitAmount);
        }

        return { success: true, returnAmount, profitAmount };
    } catch (error) {
        if (!refundCredited) {
            await releaseExpiryClaim(robot.id);
        }
        return { success: false, error: error.message };
    }
}

function calculateMaturityReturn(robot, config) {
    let returnAmount = 0;
    let profitAmount = 0;

    switch (robot.robot_type) {
        case 'high':
            if (robot.is_quantified !== 1) {
                returnAmount = parseFloat(robot.price);
                break;
            }
            returnAmount = parseFloat(robot.expected_return);
            profitAmount = returnAmount - parseFloat(robot.price);
            break;

        case 'grid':
        case 'cex':
            if (config.return_principal) {
                returnAmount = parseFloat(robot.price);
            }
            break;

        case 'dex':
            if (robot.is_quantified === 1) {
                returnAmount = parseFloat(robot.expected_return) || parseFloat(robot.price);
                profitAmount = returnAmount - parseFloat(robot.price);
            } else {
                returnAmount = parseFloat(robot.price);
            }
            break;

        default:
            throw new Error(`Unknown robot type: ${robot.robot_type}`);
    }

    return { returnAmount, profitAmount };
}

async function creditMaturityReturn({
    walletAddr,
    robot,
    returnAmount,
    principalReturn,
    frozenProfitReturn,
    isBannedUser
}) {
    const dbQuery = getDbQuery();
    await ensureUserBalanceRow(dbQuery, walletAddr);

    if (isBannedUser) {
        if (principalReturn > 0) {
            await creditUsdtBalance(dbQuery, walletAddr, principalReturn);
        }
        if (frozenProfitReturn > 0) {
            await creditFrozenUsdtBalance(dbQuery, walletAddr, frozenProfitReturn);
        }
    } else {
        await creditUsdtBalance(dbQuery, walletAddr, returnAmount);
    }

    await writeRefundHistory({
        walletAddr,
        robot,
        returnAmount,
        frozenProfitReturn,
        isBannedUser
    });

    if (isBannedUser) {
        console.log(
            `[Cron] Frozen user maturity credit: principal=${principalReturn.toFixed(4)} USDT, profit_frozen=${frozenProfitReturn.toFixed(4)} USDT ` +
            `wallet=${walletAddr.slice(0, 10)}... robot=${robot.robot_name}`
        );
    } else {
        console.log(`[Cron] Returned ${returnAmount.toFixed(4)} USDT to ${walletAddr.slice(0, 10)}... (robot: ${robot.robot_name})`);
    }
}

async function writeRefundHistory({
    walletAddr,
    robot,
    returnAmount,
    frozenProfitReturn,
    isBannedUser
}) {
    const dbQuery = getDbQuery();
    const isReturnWithProfit = (robot.robot_type === 'high' || robot.robot_type === 'dex') && robot.is_quantified === 1;
    const txDescriptionBase = isReturnWithProfit
        ? `${robot.robot_name} 到期返还（本金+收益） #robot_purchase_id=${robot.id}`
        : `${robot.robot_name} 到期返还本金 #robot_purchase_id=${robot.id}`;
    const txDescription = isBannedUser
        ? (frozenProfitReturn > 0
            ? `${txDescriptionBase}（本金已返还，收益冻结）`
            : `${txDescriptionBase}（冻结用户：仅返还本金）`)
        : txDescriptionBase;

    try {
        await dbQuery(
            `INSERT INTO transaction_history
            (wallet_address, tx_type, amount, currency, description, status, created_at)
            VALUES (?, 'refund', ?, 'USDT', ?, 'completed', NOW())`,
            [walletAddr, returnAmount, txDescription]
        );
    } catch (logErr) {
        console.error('[Cron] Failed to write transaction_history (refund already credited):', logErr.message);
    }
}

async function markRobotExpired(robotId, robotType, profitAmount) {
    const dbQuery = getDbQuery();

    try {
        await dbQuery(
            `UPDATE robot_purchases
            SET status = 'expired',
                total_profit = CASE WHEN robot_type IN ('high','dex') THEN ? ELSE total_profit END,
                updated_at = NOW()
            WHERE id = ?`,
            [profitAmount, robotId]
        );
    } catch (statusErr) {
        console.error('[Cron] Failed to update robot status after expiry processing:', statusErr.message);
    }
}

async function writeProfitAndRewards(walletAddr, robot, profitAmount) {
    const dbQuery = getDbQuery();

    try {
        await dbQuery(
            `INSERT INTO robot_earnings
            (wallet_address, robot_purchase_id, robot_name, earning_amount, created_at)
            VALUES (?, ?, ?, ?, NOW())`,
            [walletAddr, robot.id, robot.robot_name, profitAmount]
        );
    } catch (earnErr) {
        console.error('[Cron] Failed to write robot_earnings (refund state preserved):', earnErr.message);
    }

    try {
        await distributeReferralRewards(walletAddr, robot, profitAmount);
    } catch (refErr) {
        console.error('[Cron] Failed to distribute referral rewards (refund state preserved):', refErr.message);
    }
}

async function releaseExpiryClaim(robotId) {
    const dbQuery = getDbQuery();
    await dbQuery(
        `UPDATE robot_purchases SET expired_at = NULL, updated_at = NOW() WHERE id = ? AND status = 'active'`,
        [robotId]
    );
}

export {
    processAllExpiredRobots,
    processExpiredRobot
};
