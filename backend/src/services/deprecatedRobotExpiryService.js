import { CEX_REFERRAL_RATES, calculateLevelReward } from '../utils/referralMath.js';

export function createDeprecatedRobotExpiryService({ dbQuery }) {
    async function distributeMaturityReferralRewards({ walletAddr, robot, profit }) {
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
            const rewardAmount = calculateLevelReward(profit, rewardRate);

            await dbQuery(
                `UPDATE user_balances
                 SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                 WHERE wallet_address = ?`,
                [rewardAmount, referrerAddress]
            );

            await dbQuery(
                `INSERT INTO referral_rewards
                 (wallet_address, from_wallet, level, reward_rate, reward_amount, source_type, source_id, robot_name, source_amount, created_at)
                 VALUES (?, ?, ?, ?, ?, 'maturity', ?, ?, ?, NOW())`,
                [referrerAddress, walletAddr, level, rewardRate * 100, rewardAmount, robot.id, robot.robot_name, profit]
            );

            console.log(`[Maturity] 推荐奖励分发成功: level=${level}, to=${referrerAddress.slice(0, 10)}..., amount=${rewardAmount.toFixed(4)}`);
            currentWallet = referrerAddress;
        }
    }

    async function processExpiredHighRobots(walletAddr) {
        try {
            const expiredHighRobots = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ?
                 AND robot_type = 'high'
                 AND is_quantified = 1
                 AND status = 'active'
                 AND end_date < CURDATE()`,
                [walletAddr]
            );

            for (const robot of expiredHighRobots) {
                const expectedReturn = parseFloat(robot.expected_return);
                if (expectedReturn <= 0) continue;

                await dbQuery(
                    `UPDATE user_balances
                     SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                     WHERE wallet_address = ?`,
                    [expectedReturn, walletAddr]
                );

                const profit = expectedReturn - parseFloat(robot.price);
                await dbQuery(
                    `UPDATE robot_purchases
                     SET status = 'expired', total_profit = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [profit, robot.id]
                );

                if (profit > 0) {
                    await dbQuery(
                        `INSERT INTO robot_earnings
                         (wallet_address, robot_purchase_id, robot_name, earning_amount, created_at)
                         VALUES (?, ?, ?, ?, NOW())`,
                        [walletAddr, robot.id, robot.robot_name, profit]
                    );
                    await distributeMaturityReferralRewards({ walletAddr, robot, profit });
                }

                console.log(`[High Robot] Returned ${expectedReturn} USDT (profit: ${profit}) to ${walletAddr} for robot ${robot.id}`);
            }
        } catch (error) {
            console.error('处理到期High机器人失败:', error.message);
        }
    }

    async function processExpiredGridRobots(walletAddr) {
        try {
            const expiredGridRobots = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ?
                 AND robot_type = 'grid'
                 AND status = 'active'
                 AND end_date < CURDATE()`,
                [walletAddr]
            );

            for (const robot of expiredGridRobots) {
                const principal = parseFloat(robot.price);
                if (principal <= 0) continue;

                await dbQuery(
                    `UPDATE user_balances
                     SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                     WHERE wallet_address = ?`,
                    [principal, walletAddr]
                );

                await dbQuery(
                    `UPDATE robot_purchases
                     SET status = 'expired', updated_at = NOW()
                     WHERE id = ?`,
                    [robot.id]
                );

                console.log(`[Grid Robot] Returned ${principal} USDT principal to ${walletAddr} for robot ${robot.id}`);
            }
        } catch (error) {
            console.error('处理到期Grid机器人失败:', error.message);
        }
    }

    async function processExpiredCexDexRobots(walletAddr) {
        try {
            const expiredRobots = await dbQuery(
                `SELECT * FROM robot_purchases
                 WHERE wallet_address = ?
                 AND (robot_type = 'cex' OR robot_type = 'dex')
                 AND status = 'active'
                 AND end_date < CURDATE()`,
                [walletAddr]
            );

            for (const robot of expiredRobots) {
                const principal = parseFloat(robot.price);
                if (principal <= 0) continue;

                await dbQuery(
                    `UPDATE user_balances
                     SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                     WHERE wallet_address = ?`,
                    [principal, walletAddr]
                );

                await dbQuery(
                    `UPDATE robot_purchases
                     SET status = 'expired', updated_at = NOW()
                     WHERE id = ?`,
                    [robot.id]
                );

                console.log(`[CEX/DEX Robot] Returned ${principal} USDT principal to ${walletAddr} for robot ${robot.id} (${robot.robot_name})`);
            }
        } catch (error) {
            console.error('处理到期CEX/DEX机器人失败:', error.message);
        }
    }

    return {
        processExpiredCexDexRobots,
        processExpiredGridRobots,
        processExpiredHighRobots
    };
}
