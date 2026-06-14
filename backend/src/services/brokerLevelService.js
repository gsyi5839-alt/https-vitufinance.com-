import { MIN_ROBOT_PURCHASE_LV1, MIN_ROBOT_PURCHASE_LV2_5 } from '../utils/teamMath.js';

const MIN_TEAM_MEMBERS_BY_LEVEL = {
    1: 5,
    2: 20,
    3: 60,
    4: 150,
    5: 350
};

export function createBrokerLevelService({ dbQuery }) {
    function getLevelName(level) {
        const names = {
            0: 'Regular User',
            1: 'Level 1 Broker',
            2: 'Level 2 Broker',
            3: 'Level 3 Broker',
            4: 'Level 4 Broker',
            5: 'Level 5 Broker'
        };
        return names[level] || 'Regular User';
    }

    async function getQualifiedDirectCounts(walletAddr) {
        const directResultLv1 = await dbQuery(
            `SELECT COUNT(DISTINCT r.wallet_address) as count
             FROM user_referrals r
             INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
             WHERE r.referrer_address = ?
               AND rp.price >= ?
               AND rp.status IN ('active', 'expired')`,
            [walletAddr, MIN_ROBOT_PURCHASE_LV1]
        );

        const directResultLv2_5 = await dbQuery(
            `SELECT COUNT(DISTINCT r.wallet_address) as count
             FROM user_referrals r
             INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
             WHERE r.referrer_address = ?
               AND rp.price >= ?
               AND rp.status IN ('active', 'expired')`,
            [walletAddr, MIN_ROBOT_PURCHASE_LV2_5]
        );

        return {
            lv1: parseInt(directResultLv1[0]?.count) || 0,
            lv2_5: parseInt(directResultLv2_5[0]?.count) || 0
        };
    }

    async function collectTeamWallets(walletAddr, maxDepth = 8) {
        const allTeamWallets = [];
        let currentLevelWallets = [walletAddr];

        for (let depth = 1; depth <= maxDepth; depth++) {
            if (currentLevelWallets.length === 0) break;

            const placeholders = currentLevelWallets.map(() => '?').join(',');
            const levelMembers = await dbQuery(
                `SELECT DISTINCT wallet_address FROM user_referrals WHERE referrer_address IN (${placeholders})`,
                currentLevelWallets
            );

            if (levelMembers.length === 0) break;

            const levelWallets = levelMembers.map(member => member.wallet_address);
            allTeamWallets.push(...levelWallets);
            currentLevelWallets = levelWallets;
        }

        return allTeamWallets;
    }

    async function getTeamPerformance(allTeamWallets) {
        if (allTeamWallets.length === 0) {
            return 0;
        }

        const placeholders = allTeamWallets.map(() => '?').join(',');
        const performanceResult = await dbQuery(
            `SELECT COALESCE(SUM(price), 0) as total
             FROM robot_purchases
             WHERE wallet_address IN (${placeholders})
               AND status IN ('active', 'expired')`,
            allTeamWallets
        );

        return parseFloat(performanceResult[0]?.total) || 0;
    }

    async function calculateUserLevel(walletAddr, visitedAddresses = new Set()) {
        try {
            if (visitedAddresses.has(walletAddr)) {
                return 0;
            }
            visitedAddresses.add(walletAddr);

            const directCounts = await getQualifiedDirectCounts(walletAddr);
            if (directCounts.lv1 < 5) return 0;

            const allTeamWallets = await collectTeamWallets(walletAddr);
            const teamMembers = allTeamWallets.length;

            if (teamMembers < MIN_TEAM_MEMBERS_BY_LEVEL[1]) {
                return 0;
            }

            const totalPerformance = await getTeamPerformance(allTeamWallets);
            if (totalPerformance <= 1000) {
                return 0;
            }

            const subBrokerStats = await getSubBrokerStats(walletAddr, visitedAddresses);

            if (
                teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[5] &&
                directCounts.lv2_5 >= 50 &&
                totalPerformance > 200000 &&
                subBrokerStats.level4 >= 2
            ) {
                return 5;
            }

            if (
                teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[4] &&
                directCounts.lv2_5 >= 30 &&
                totalPerformance > 80000 &&
                subBrokerStats.level3 >= 2
            ) {
                return 4;
            }

            if (
                teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[3] &&
                directCounts.lv2_5 >= 20 &&
                totalPerformance > 20000 &&
                subBrokerStats.level2 >= 2
            ) {
                return 3;
            }

            if (
                teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[2] &&
                directCounts.lv2_5 >= 10 &&
                totalPerformance > 5000 &&
                subBrokerStats.level1 >= 2
            ) {
                return 2;
            }

            if (
                teamMembers >= MIN_TEAM_MEMBERS_BY_LEVEL[1] &&
                directCounts.lv1 >= 5 &&
                totalPerformance > 1000
            ) {
                return 1;
            }

            return 0;
        } catch (error) {
            console.error(`[calculateUserLevel] Error for ${walletAddr}:`, error.message);
            return 0;
        }
    }

    async function getSubBrokerStats(walletAddr, visitedAddresses = new Set()) {
        try {
            const stats = {
                level1: 0,
                level2: 0,
                level3: 0,
                level4: 0,
                level5: 0
            };

            const directMembers = await dbQuery(
                `SELECT DISTINCT r.wallet_address
                 FROM user_referrals r
                 INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
                 WHERE r.referrer_address = ?
                   AND rp.price >= ?
                   AND rp.status IN ('active', 'expired')`,
                [walletAddr, MIN_ROBOT_PURCHASE_LV1]
            );

            for (const member of directMembers) {
                const memberAddr = member.wallet_address;

                if (visitedAddresses.has(memberAddr)) {
                    continue;
                }

                const memberLevel = await calculateUserLevel(memberAddr, new Set(visitedAddresses));

                if (memberLevel === 1) {
                    stats.level1++;
                } else if (memberLevel === 2) {
                    stats.level2++;
                } else if (memberLevel === 3) {
                    stats.level3++;
                } else if (memberLevel === 4) {
                    stats.level4++;
                } else if (memberLevel === 5) {
                    stats.level5++;
                }
            }

            return stats;
        } catch (error) {
            console.error(`[getSubBrokerStats] Error for ${walletAddr}:`, error.message);
            return {
                level1: 0,
                level2: 0,
                level3: 0,
                level4: 0,
                level5: 0
            };
        }
    }

    return {
        calculateUserLevel,
        collectTeamWallets,
        getLevelName,
        getQualifiedDirectCounts,
        getSubBrokerStats,
        getTeamPerformance
    };
}
