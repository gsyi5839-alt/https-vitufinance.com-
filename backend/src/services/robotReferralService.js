import {
    CEX_REFERRAL_RATES,
    DEX_REFERRAL_RATES,
    calculateLevelReward,
    calculateCexRewards,
    calculateDexRewards
} from '../utils/referralMath.js';
import { getDbQuery, isValidWalletAddress } from './robotContext.js';

export async function distributeReferralRewards(walletAddr, robot, profit, options = {}) {
    const dbQuery = getDbQuery();

    try {
        const { sourceType = 'quantify', sourceId = 0 } = options;
        const maxLevel = CEX_REFERRAL_RATES.length;
        let currentWallet = walletAddr;
        // SECURITY: track visited wallets to break referral cycles (A→B→A) that would
        // otherwise re-credit the same uplines indefinitely.
        const visited = new Set([String(walletAddr).toLowerCase()]);

        const expectedRewards = calculateCexRewards(profit);
        console.log(`[Referral Math] ${expectedRewards.summary}`);

        for (let level = 1; level <= maxLevel; level++) {
            const referrerResult = await dbQuery(
                'SELECT referrer_address FROM user_referrals WHERE wallet_address = ? AND referrer_address IS NOT NULL',
                [currentWallet]
            );

            if (referrerResult.length === 0) break;

            const referrerAddress = referrerResult[0].referrer_address;
            if (!referrerAddress || !isValidWalletAddress(referrerAddress)) break;

            // Cycle guard: stop if we've already credited this wallet in this chain.
            if (visited.has(referrerAddress.toLowerCase())) {
                console.warn(`[Referral] Cycle detected at level ${level} (${referrerAddress.slice(0, 10)}...), stopping.`);
                break;
            }
            visited.add(referrerAddress.toLowerCase());

            const rewardRate = CEX_REFERRAL_RATES[level - 1];
            const rewardAmount = calculateLevelReward(profit, rewardRate);

            await dbQuery(
                `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
                 VALUES (?, 0, 0, NOW(), NOW())`,
                [referrerAddress]
            );

            // SECURITY: insert the reward row first via INSERT IGNORE (deduped by the unique
            // key uniq_referral_reward), and credit the balance ONLY if a new row was actually
            // inserted. Race-safe against concurrent triggers double-crediting.
            const inserted = await dbQuery(
                `INSERT IGNORE INTO referral_rewards
                 (wallet_address, from_wallet, level, reward_rate, reward_amount, source_type, source_id, robot_name, source_amount, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [referrerAddress, walletAddr, level, rewardRate * 100, rewardAmount, sourceType, sourceId, robot.robot_name, profit]
            );

            if (!inserted || inserted.affectedRows === 0) {
                console.log(`[Referral] Skip duplicate reward level=${level} source_type=${sourceType} source_id=${sourceId}`);
                currentWallet = referrerAddress;
                continue;
            }

            await dbQuery(
                `UPDATE user_balances
                 SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                 WHERE wallet_address = ?`,
                [rewardAmount, referrerAddress]
            );

            console.log(`[Referral] Level ${level} reward: ${rewardAmount.toFixed(4)} USDT to ${referrerAddress.slice(0, 10)}...`);
            currentWallet = referrerAddress;
        }
    } catch (error) {
        console.error('发放推荐奖励失败:', error.message);
    }
}

export async function distributeDexPurchaseRewards(walletAddr, robotName, purchaseAmount, sourceId = null) {
    const dbQuery = getDbQuery();

    try {
        const maxLevel = DEX_REFERRAL_RATES.length;
        let currentWallet = walletAddr;
        // SECURITY: break referral cycles (A→B→A) so uplines aren't credited repeatedly.
        const visited = new Set([String(walletAddr).toLowerCase()]);

        const expectedRewards = calculateDexRewards(purchaseAmount);
        console.log(`[DEX Reward Math] ${expectedRewards.summary}`);
        console.log(`[DEX Reward] Processing purchase rewards for ${robotName}, amount: ${purchaseAmount} USDT`);

        for (let level = 1; level <= maxLevel; level++) {
            const referrerResult = await dbQuery(
                'SELECT referrer_address FROM user_referrals WHERE wallet_address = ? AND referrer_address IS NOT NULL',
                [currentWallet]
            );

            if (referrerResult.length === 0) {
                console.log(`[DEX Reward] No referrer found at level ${level}`);
                break;
            }

            const referrerAddress = referrerResult[0].referrer_address;
            if (!referrerAddress || !isValidWalletAddress(referrerAddress)) {
                console.log(`[DEX Reward] Invalid referrer at level ${level}`);
                break;
            }

            // Cycle guard
            if (visited.has(referrerAddress.toLowerCase())) {
                console.warn(`[DEX Reward] Cycle detected at level ${level} (${referrerAddress.slice(0, 10)}...), stopping.`);
                break;
            }
            visited.add(referrerAddress.toLowerCase());

            const rewardRate = DEX_REFERRAL_RATES[level - 1];
            const rewardAmount = calculateLevelReward(purchaseAmount, rewardRate);

            await dbQuery(
                `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
                 VALUES (?, 0, 0, NOW(), NOW())`,
                [referrerAddress]
            );

            // SECURITY: insert-then-credit. Credit balance ONLY if a new reward row was
            // inserted (deduped by uniq_referral_reward). Requires a non-null sourceId to
            // make the (source_type, source_id) pair unique per purchase.
            const inserted = await dbQuery(
                `INSERT IGNORE INTO referral_rewards
                 (wallet_address, from_wallet, level, reward_rate, reward_amount, source_type, source_id, robot_name, source_amount, created_at)
                 VALUES (?, ?, ?, ?, ?, 'dex_purchase', ?, ?, ?, NOW())`,
                [referrerAddress, walletAddr, level, rewardRate * 100, rewardAmount, sourceId || null, robotName, purchaseAmount]
            );

            if (!inserted || inserted.affectedRows === 0) {
                console.log(`[DEX Reward] Skip duplicate reward level=${level} source_id=${sourceId}`);
                currentWallet = referrerAddress;
                continue;
            }

            await dbQuery(
                `UPDATE user_balances
                 SET usdt_balance = usdt_balance + ?, updated_at = NOW()
                 WHERE wallet_address = ?`,
                [rewardAmount, referrerAddress]
            );

            console.log(`[DEX Reward] Level ${level}: ${rewardAmount.toFixed(4)} USDT (${rewardRate * 100}%) to ${referrerAddress.slice(0, 10)}...`);
            currentWallet = referrerAddress;
        }

        console.log('[DEX Reward] Purchase rewards distributed successfully');
    } catch (error) {
        console.error('[DEX Reward] 发放DEX购买奖励失败:', error.message);
    }
}
