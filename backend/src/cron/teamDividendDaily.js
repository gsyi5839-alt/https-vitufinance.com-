import { BROKER_LEVELS } from '../utils/teamMath.js';
import {
    getDbQuery,
    getBeijingDateString
} from './teamDividendState.js';
import { calculateBrokerLevel } from './teamBrokerLevel.js';

async function processAllTeamDividends() {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        console.error('[TeamCron] 数据库查询函数未设置');
        return { success: false, error: 'Database not configured' };
    }

    const startTime = new Date();
    const today = getBeijingDateString(startTime);
    const stats = {
        totalUsers: 0,
        processedUsers: 0,
        levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalDividend: 0,
        errors: 0
    };

    console.log('[TeamCron] ========================================');
    console.log(`[TeamCron] 开始处理团队每日分红 ${today}`);
    console.log('[TeamCron] ========================================');

    try {
        const alreadyProcessed = await dbQuery(
            `SELECT COUNT(*) as count
             FROM team_rewards
             WHERE reward_date = ? AND reward_type = 'daily_dividend'`,
            [today]
        );

        if (parseInt(alreadyProcessed[0]?.count) > 0) {
            console.log('[TeamCron] ⚠️ 今天已经发放过分红，跳过');
            return { success: true, skipped: true, reason: 'Already processed today' };
        }

        const potentialBrokers = await dbQuery(
            `SELECT DISTINCT referrer_address as wallet_address
             FROM user_referrals
             WHERE referrer_address IS NOT NULL`
        );

        stats.totalUsers = potentialBrokers.length;
        console.log(`[TeamCron] 找到 ${stats.totalUsers} 个潜在经纪人`);

        for (const user of potentialBrokers) {
            await processPotentialBroker(user.wallet_address, today, stats);
        }

        const duration = (new Date() - startTime) / 1000;
        logDividendStats(stats, duration);

        return {
            success: true,
            date: today,
            stats,
            duration
        };
    } catch (error) {
        console.error('[TeamCron] 处理团队分红失败:', error.message);
        return { success: false, error: error.message };
    }
}

async function processPotentialBroker(walletAddr, today, stats) {
    try {
        const level = await calculateBrokerLevel(walletAddr);
        if (level <= 0) return;

        const dividendAmount = BROKER_LEVELS[level].dailyDividend;
        await payDailyDividend(walletAddr, level, dividendAmount, today);

        stats.levelCounts[level]++;
        stats.totalDividend += dividendAmount;
        stats.processedUsers++;

        console.log(`[TeamCron] ✅ ${walletAddr.slice(0, 10)}... : ${level}级经纪人, +${dividendAmount} USDT`);
    } catch (error) {
        stats.errors++;
        console.error(`[TeamCron] ❌ 处理用户 ${walletAddr.slice(0, 10)}... 失败:`, error.message);
    }
}

async function payDailyDividend(walletAddr, level, dividendAmount, today) {
    const dbQuery = getDbQuery();

    await dbQuery(
        `INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, created_at, updated_at)
         VALUES (?, 0, 0, NOW(), NOW())`,
        [walletAddr]
    );

    await dbQuery(
        `UPDATE user_balances
         SET usdt_balance = usdt_balance + ?, updated_at = NOW()
         WHERE wallet_address = ?`,
        [dividendAmount, walletAddr]
    );

    await dbQuery(
        `INSERT INTO team_rewards
         (wallet_address, reward_type, broker_level, reward_amount, reward_date, created_at)
         VALUES (?, 'daily_dividend', ?, ?, ?, NOW())`,
        [walletAddr, level, dividendAmount, today]
    );
}

function logDividendStats(stats, duration) {
    console.log('[TeamCron] ========================================');
    console.log(`[TeamCron] 处理完成，耗时 ${duration.toFixed(2)} 秒`);
    console.log(`[TeamCron] 总用户: ${stats.totalUsers}`);
    console.log(`[TeamCron] 达标经纪人: ${stats.processedUsers}`);
    console.log('[TeamCron] 各等级分布:');

    for (let i = 1; i <= 5; i++) {
        if (stats.levelCounts[i] > 0) {
            console.log(`[TeamCron]   ${i}级: ${stats.levelCounts[i]}人, 共 ${stats.levelCounts[i] * BROKER_LEVELS[i].dailyDividend} USDT`);
        }
    }

    console.log(`[TeamCron] 总发放: ${stats.totalDividend} USDT`);
    console.log(`[TeamCron] 错误数: ${stats.errors}`);
    console.log('[TeamCron] ========================================');
}

export {
    processAllTeamDividends,
    payDailyDividend
};
