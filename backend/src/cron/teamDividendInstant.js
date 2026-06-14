import { BROKER_LEVELS } from '../utils/teamMath.js';
import {
    getDbQuery,
    getBeijingDateString
} from './teamDividendState.js';
import { calculateBrokerLevel } from './teamBrokerLevel.js';
import { payDailyDividend } from './teamDividendDaily.js';

async function processWalletDailyDividend(walletAddr) {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        return { success: false, error: 'Database not configured', wallet_address: walletAddr };
    }

    try {
        const today = getBeijingDateString(new Date());
        const level = await calculateBrokerLevel(walletAddr);

        if (level <= 0) {
            return { success: true, rewarded: false, level: 0, wallet_address: walletAddr, reason: 'Not qualified' };
        }

        const alreadyRewarded = await dbQuery(
            `SELECT COUNT(*) as count FROM team_rewards
             WHERE wallet_address = ?
             AND reward_date = ?
             AND reward_type = 'daily_dividend'`,
            [walletAddr, today]
        );

        if (parseInt(alreadyRewarded[0]?.count) > 0) {
            return { success: true, rewarded: false, level, wallet_address: walletAddr, reason: 'Already rewarded today' };
        }

        const dividendAmount = BROKER_LEVELS[level].dailyDividend;
        await payDailyDividend(walletAddr, level, dividendAmount, today);

        console.log(`[TeamCron] ✅ 即时分红: ${walletAddr.slice(0, 10)}... Level${level} +${dividendAmount} USDT`);

        return {
            success: true,
            rewarded: true,
            level,
            amount: dividendAmount,
            wallet_address: walletAddr
        };
    } catch (error) {
        console.error(`[TeamCron] ❌ 即时分红失败 ${walletAddr.slice(0, 10)}...:`, error.message);
        return { success: false, error: error.message, wallet_address: walletAddr };
    }
}

async function processUplineDailyDividends(walletAddr) {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        return { success: false, error: 'Database not configured' };
    }

    try {
        let currentAddr = walletAddr;
        let processedCount = 0;
        let rewardedCount = 0;
        const maxLevels = 8;

        for (let level = 0; level < maxLevels; level++) {
            const referrerResult = await dbQuery(
                'SELECT referrer_address FROM user_referrals WHERE wallet_address = ?',
                [currentAddr]
            );

            if (referrerResult.length === 0 || !referrerResult[0].referrer_address) {
                break;
            }

            const referrerAddr = referrerResult[0].referrer_address;
            processedCount++;

            const result = await processWalletDailyDividend(referrerAddr);
            if (result.rewarded) {
                rewardedCount++;
            }

            currentAddr = referrerAddr;
        }

        return {
            success: true,
            processed: processedCount,
            rewarded: rewardedCount
        };
    } catch (error) {
        console.error('[TeamCron] ❌ 处理上级分红失败:', error.message);
        return { success: false, error: error.message };
    }
}

export {
    processWalletDailyDividend,
    processUplineDailyDividends
};
