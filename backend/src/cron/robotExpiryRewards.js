import {
    CEX_REFERRAL_RATES,
    calculateLevelReward
} from '../utils/referralMath.js';
import {
    getDbQuery,
    isValidWalletAddress
} from './robotExpiryState.js';

async function distributeReferralRewards(walletAddr, robot, profit) {
    const dbQuery = getDbQuery();
    const maxLevel = CEX_REFERRAL_RATES.length;
    let currentWallet = walletAddr;
    let totalRewards = 0;
    // SECURITY: break referral cycles (A→B→A) so uplines aren't credited repeatedly.
    const visited = new Set([String(walletAddr).toLowerCase()]);

    try {
        for (let level = 1; level <= maxLevel; level++) {
            const referrerResult = await dbQuery(
                'SELECT referrer_address FROM user_referrals WHERE wallet_address = ? AND referrer_address IS NOT NULL',
                [currentWallet]
            );

            if (referrerResult.length === 0) break;

            const referrerAddress = referrerResult[0].referrer_address;
            if (!referrerAddress || !isValidWalletAddress(referrerAddress)) break;

            // Cycle guard
            if (visited.has(referrerAddress.toLowerCase())) {
                console.warn(`[Cron] Referral cycle detected at level ${level} (${referrerAddress.slice(0, 10)}...), stopping.`);
                break;
            }
            visited.add(referrerAddress.toLowerCase());

            const rewardRate = CEX_REFERRAL_RATES[level - 1];
            const rewardAmount = calculateLevelReward(profit, rewardRate);

            await ensureReferrerBalance(referrerAddress);

            // SECURITY: insert-then-credit (race-safe via uniq_referral_reward). Credit
            // the balance only if a new reward row was actually inserted.
            const credited = await creditReferralReward(referrerAddress, walletAddr, robot, profit, level, rewardRate, rewardAmount);
            if (credited) {
                totalRewards += rewardAmount;
            } else {
                console.log(`[Cron] Skip duplicate maturity reward level=${level} robot_purchase_id=${robot.id}`);
            }
            currentWallet = referrerAddress;
        }

        if (totalRewards > 0) {
            console.log(`[Cron] Distributed ${totalRewards.toFixed(4)} USDT referral rewards for robot ${robot.id}`);
        }
    } catch (error) {
        console.error('[Cron] Failed to distribute referral rewards:', error.message);
    }
}

async function ensureReferrerBalance(referrerAddress) {
    const dbQuery = getDbQuery();
    await dbQuery(
        `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
        VALUES (?, 0, 0, NOW(), NOW())`,
        [referrerAddress]
    );
}

async function creditReferralReward(referrerAddress, walletAddr, robot, profit, level, rewardRate, rewardAmount) {
    const dbQuery = getDbQuery();

    // Insert the reward row first (deduped by uniq_referral_reward). Returns whether a new
    // row was inserted so the caller credits the balance at most once.
    const inserted = await dbQuery(
        `INSERT IGNORE INTO referral_rewards
         (wallet_address, from_wallet, level, reward_rate, reward_amount, source_type, source_id, robot_name, source_amount, created_at)
         VALUES (?, ?, ?, ?, ?, 'maturity', ?, ?, ?, NOW())`,
        [referrerAddress, walletAddr, level, rewardRate * 100, rewardAmount, robot.id, robot.robot_name, profit]
    );

    if (!inserted || inserted.affectedRows === 0) {
        return false;
    }

    await dbQuery(
        `UPDATE user_balances
         SET usdt_balance = usdt_balance + ?, updated_at = NOW()
         WHERE wallet_address = ?`,
        [rewardAmount, referrerAddress]
    );

    return true;
}

export {
    distributeReferralRewards
};
