import {
    MIN_ROBOT_PURCHASE_LV1,
    MIN_ROBOT_PURCHASE_LV2_5
} from '../utils/teamMath.js';
import { getDbQuery } from './teamDividendState.js';

const MIN_TEAM_MEMBERS_BY_LEVEL = { 1: 5, 2: 20, 3: 60, 4: 150, 5: 350 };

async function calculateBrokerLevel(walletAddr, visitedAddresses = new Set()) {
    const dbQuery = getDbQuery();

    try {
        if (visitedAddresses.has(walletAddr)) {
            return 0;
        }
        visitedAddresses.add(walletAddr);

        const directCountLV1 = await getQualifiedDirectCount(walletAddr, MIN_ROBOT_PURCHASE_LV1);
        const directCountLV2_5 = await getQualifiedDirectCount(walletAddr, MIN_ROBOT_PURCHASE_LV2_5);
        const allTeamWallets = await getTeamWallets(walletAddr);
        const teamMembers = allTeamWallets.length;

        if (teamMembers < MIN_TEAM_MEMBERS_BY_LEVEL[1]) {
            return 0;
        }

        const totalPerformance = await getTeamPerformance(allTeamWallets);
        if (directCountLV1 < 5 || totalPerformance <= 1000) {
            return 0;
        }

        const subBrokerCounts = await getSubBrokerCounts(walletAddr, visitedAddresses);

        if (teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[5] && directCountLV2_5 >= 50 && totalPerformance > 200000 && subBrokerCounts[4] >= 2) {
            return 5;
        }
        if (teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[4] && directCountLV2_5 >= 30 && totalPerformance > 80000 && subBrokerCounts[3] >= 2) {
            return 4;
        }
        if (teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[3] && directCountLV2_5 >= 20 && totalPerformance > 20000 && subBrokerCounts[2] >= 2) {
            return 3;
        }
        if (teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[2] && directCountLV2_5 >= 10 && totalPerformance > 5000 && subBrokerCounts[1] >= 2) {
            return 2;
        }
        if (teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[1] && directCountLV1 >= 5 && totalPerformance > 1000) {
            return 1;
        }

        return 0;
    } catch (error) {
        console.error(`[TeamCron] 计算用户 ${walletAddr.slice(0, 10)}... 等级失败:`, error.message);
        return 0;
    }
}

async function getQualifiedDirectCount(walletAddr, minPurchaseAmount) {
    const dbQuery = getDbQuery();
    const result = await dbQuery(
        `SELECT COUNT(DISTINCT r.wallet_address) as count
         FROM user_referrals r
         INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
         WHERE r.referrer_address = ?
           AND rp.price >= ?
           AND rp.status IN ('active', 'expired')`,
        [walletAddr, minPurchaseAmount]
    );
    return parseInt(result[0]?.count) || 0;
}

async function getTeamWallets(walletAddr) {
    const dbQuery = getDbQuery();
    const allTeamWallets = [];
    let currentLevelWallets = [walletAddr];

    for (let level = 1; level <= 8; level++) {
        if (currentLevelWallets.length === 0) break;

        const placeholders = currentLevelWallets.map(() => '?').join(',');
        const levelMembers = await dbQuery(
            `SELECT DISTINCT wallet_address FROM user_referrals WHERE referrer_address IN (${placeholders})`,
            currentLevelWallets
        );

        if (levelMembers.length === 0) break;

        const levelWallets = levelMembers.map((member) => member.wallet_address);
        allTeamWallets.push(...levelWallets);
        currentLevelWallets = levelWallets;
    }

    return allTeamWallets;
}

async function getTeamPerformance(allTeamWallets) {
    const dbQuery = getDbQuery();
    if (allTeamWallets.length === 0) return 0;

    const teamPlaceholders = allTeamWallets.map(() => '?').join(',');
    const mode = (process.env.TEAM_PERFORMANCE_MODE || 'deposit_records').toLowerCase();

    if (mode === 'robot_purchases') {
        const performanceResult = await dbQuery(
            `SELECT COALESCE(SUM(price), 0) as total
             FROM robot_purchases
             WHERE wallet_address IN (${teamPlaceholders})
               AND status IN ('active', 'expired')`,
            allTeamWallets
        );
        return parseFloat(performanceResult[0]?.total) || 0;
    }

    const performanceResult = await dbQuery(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM deposit_records
         WHERE wallet_address IN (${teamPlaceholders})
           AND status = 'completed'`,
        allTeamWallets
    );
    return parseFloat(performanceResult[0]?.total) || 0;
}

async function getSubBrokerCounts(walletAddr, visitedAddresses = new Set()) {
    const dbQuery = getDbQuery();
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    try {
        const directMembers = await dbQuery(
            'SELECT wallet_address FROM user_referrals WHERE referrer_address = ?',
            [walletAddr]
        );

        for (const member of directMembers) {
            const memberWallet = member.wallet_address;
            if (visitedAddresses.has(memberWallet)) {
                continue;
            }

            const memberLevel = await calculateBrokerLevel(memberWallet, new Set(visitedAddresses));
            if (memberLevel >= 1 && memberLevel <= 5) {
                counts[memberLevel]++;
            }
        }
    } catch (error) {
        console.error('[TeamCron] 获取下级经纪人统计失败:', error.message);
    }

    return counts;
}

export {
    calculateBrokerLevel,
    getSubBrokerCounts
};
