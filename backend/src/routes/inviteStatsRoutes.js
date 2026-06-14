import express from 'express';

const REWARD_PERCENTAGES = ['30%', '10%', '5%', '1%', '1%', '1%', '1%', '1%'];

const LEVEL_REQUIREMENTS = {
    0: { directMembers: 5, subBrokers: 0, subBrokerLevel: 0, performance: 1000, nextLevel: 1 },
    1: { directMembers: 10, subBrokers: 2, subBrokerLevel: 1, performance: 5000, nextLevel: 2 },
    2: { directMembers: 20, subBrokers: 2, subBrokerLevel: 2, performance: 20000, nextLevel: 3 },
    3: { directMembers: 30, subBrokers: 2, subBrokerLevel: 3, performance: 80000, nextLevel: 4 },
    4: { directMembers: 50, subBrokers: 2, subBrokerLevel: 4, performance: 200000, nextLevel: 5 },
    5: { directMembers: 50, subBrokers: 2, subBrokerLevel: 4, performance: 200000, nextLevel: 5 }
};

function noCache(res) {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
    });
}

async function countDirectMembers(dbQuery, walletAddr) {
    const result = await dbQuery(
        'SELECT COUNT(*) as count FROM user_referrals WHERE referrer_address = ?',
        [walletAddr]
    );
    return parseInt(result[0]?.count) || 0;
}

async function countActiveReferrals(dbQuery, walletAddr) {
    const result = await dbQuery(
        `SELECT COUNT(DISTINCT r.wallet_address) as count
         FROM user_referrals r
         INNER JOIN robot_purchases rp ON r.wallet_address = rp.wallet_address
         WHERE r.referrer_address = ? AND rp.price >= 20 AND rp.status IN ('active', 'expired')`,
        [walletAddr]
    );
    return parseInt(result[0]?.count) || 0;
}

async function collectTeamWallets(dbQuery, walletAddr, maxDepth = 8) {
    let allTeamWallets = [];
    let currentLevelWallets = [walletAddr];

    const level1Result = await dbQuery(
        'SELECT wallet_address FROM user_referrals WHERE referrer_address = ?',
        [walletAddr]
    );
    allTeamWallets = level1Result.map(row => row.wallet_address);
    currentLevelWallets = [...allTeamWallets];

    for (let level = 2; level <= maxDepth; level++) {
        if (currentLevelWallets.length === 0) break;

        const placeholders = currentLevelWallets.map(() => '?').join(',');
        const levelResult = await dbQuery(
            `SELECT wallet_address FROM user_referrals WHERE referrer_address IN (${placeholders})`,
            currentLevelWallets
        );

        currentLevelWallets = levelResult.map(row => row.wallet_address);
        allTeamWallets = allTeamWallets.concat(currentLevelWallets);
    }

    return allTeamWallets;
}

async function sumForWallets(dbQuery, wallets, sqlPrefix) {
    if (wallets.length === 0) {
        return 0;
    }

    const placeholders = wallets.map(() => '?').join(',');
    const result = await dbQuery(`${sqlPrefix} (${placeholders})`, wallets);
    return parseFloat(result[0]?.total) || 0;
}

async function getInviteAdjustments(dbQuery, walletAddr) {
    try {
        const result = await dbQuery(
            'SELECT * FROM user_invite_adjustments WHERE wallet_address = ?',
            [walletAddr]
        );
        return result?.[0] || {};
    } catch (error) {
        console.warn('[Invite Stats] Failed to get adjustments:', error.message);
        return {};
    }
}

async function buildLevelCounts(dbQuery, walletAddr, maxDepth = 10) {
    const levelCounts = {};
    const level1Result = await dbQuery(
        'SELECT COUNT(*) as count FROM user_referrals WHERE referrer_address = ?',
        [walletAddr]
    );
    levelCounts['1'] = parseInt(level1Result[0]?.count) || 0;

    let currentLevelAddresses = await dbQuery(
        'SELECT wallet_address FROM user_referrals WHERE referrer_address = ?',
        [walletAddr]
    );

    for (let level = 2; level <= maxDepth; level++) {
        if (currentLevelAddresses.length === 0) {
            levelCounts[level.toString()] = 0;
            continue;
        }

        const addresses = currentLevelAddresses.map(row => row.wallet_address);
        const placeholders = addresses.map(() => '?').join(',');
        const nextLevelResult = await dbQuery(
            `SELECT wallet_address FROM user_referrals WHERE referrer_address IN (${placeholders})`,
            addresses
        );

        levelCounts[level.toString()] = nextLevelResult.length;
        currentLevelAddresses = nextLevelResult;
    }

    return levelCounts;
}

async function buildTeamStats(dbQuery, walletAddr) {
    const stats = [];
    let currentLevelAddresses = await dbQuery(
        'SELECT wallet_address FROM user_referrals WHERE referrer_address = ?',
        [walletAddr]
    );

    for (let level = 1; level <= 8; level++) {
        if (level > 1 && currentLevelAddresses.length > 0) {
            const addresses = currentLevelAddresses.map(row => row.wallet_address);
            const placeholders = addresses.map(() => '?').join(',');
            currentLevelAddresses = await dbQuery(
                `SELECT wallet_address FROM user_referrals WHERE referrer_address IN (${placeholders})`,
                addresses
            );
        }

        const levelCount = currentLevelAddresses.length;
        let totalInvestment = 0;

        if (levelCount > 0) {
            const levelAddresses = currentLevelAddresses.map(row => row.wallet_address);
            const levelPlaceholders = levelAddresses.map(() => '?').join(',');
            const investmentResult = await dbQuery(
                `SELECT COALESCE(SUM(price), 0) as total
                 FROM robot_purchases
                 WHERE wallet_address IN (${levelPlaceholders}) AND status = 'active'`,
                levelAddresses
            );
            totalInvestment = parseFloat(investmentResult[0]?.total) || 0;
        }

        stats.push({
            level,
            count: levelCount,
            totalInvestment: totalInvestment.toFixed(4),
            rewardPercentage: REWARD_PERCENTAGES[level - 1]
        });
    }

    return stats;
}

export function createInviteStatsRoutes({
    dbQuery,
    calculateUserLevel,
    getQualifiedDirectCounts,
    getSubBrokerStats,
    processWalletDailyDividend
}) {
    const router = express.Router();

    router.get('/stats', async (req, res) => {
        noCache(res);

        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            const walletAddr = wallet_address.toLowerCase();
            const directCounts = await getQualifiedDirectCounts(walletAddr);
            const activeReferrals = await countActiveReferrals(dbQuery, walletAddr);
            const allDirectMembers = await countDirectMembers(dbQuery, walletAddr);
            const allTeamWallets = await collectTeamWallets(dbQuery, walletAddr);
            const teamMembers = allTeamWallets.length;

            const totalRecharge = await sumForWallets(
                dbQuery,
                allTeamWallets,
                `SELECT COALESCE(SUM(amount), 0) as total FROM deposit_records
                 WHERE status = 'completed' AND wallet_address IN`
            );
            const totalWithdrawals = await sumForWallets(
                dbQuery,
                allTeamWallets,
                `SELECT COALESCE(SUM(amount), 0) as total FROM withdraw_records
                 WHERE status = 'completed' AND wallet_address IN`
            );
            const teamEarnings = await sumForWallets(
                dbQuery,
                allTeamWallets,
                `SELECT COALESCE(SUM(earning_amount), 0) as total FROM robot_earnings
                 WHERE DATE(created_at) = CURDATE() AND wallet_address IN`
            );

            const myEarningsResult = await dbQuery(
                `SELECT COALESCE(SUM(earning_amount), 0) as total
                 FROM robot_earnings
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );
            const myReferralRewardResult = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as total
                 FROM referral_rewards
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );
            const myTeamRewardResult = await dbQuery(
                `SELECT COALESCE(SUM(reward_amount), 0) as total
                 FROM team_rewards
                 WHERE wallet_address = ? AND DATE(created_at) = CURDATE()`,
                [walletAddr]
            );

            const myEarnings = parseFloat(myEarningsResult[0]?.total) || 0;
            const myReferralReward = parseFloat(myReferralRewardResult[0]?.total) || 0;
            const myTeamReward = parseFloat(myTeamRewardResult[0]?.total) || 0;
            const teamDailyIncome = myEarnings + myReferralReward + myTeamReward;

            console.log(`[Invite Stats] ${walletAddr.slice(0, 10)}... 今日收益明细:`);
            console.log(`  团队量化收益(不计入本人到账): ${teamEarnings.toFixed(4)} USDT`);
            console.log(`  自己量化收益: ${myEarnings.toFixed(4)} USDT`);
            console.log(`  推荐奖励(到账): ${myReferralReward.toFixed(4)} USDT`);
            console.log(`  团队奖励(到账): ${myTeamReward.toFixed(4)} USDT`);
            console.log(`  今日总收入: ${teamDailyIncome.toFixed(4)} USDT`);

            const brokerLevel = await calculateUserLevel(walletAddr);
            const referralRewardResult = await dbQuery(
                'SELECT COALESCE(SUM(reward_amount), 0) as total FROM referral_rewards WHERE wallet_address = ?',
                [walletAddr]
            );
            const teamRewardResult = await dbQuery(
                'SELECT COALESCE(SUM(reward_amount), 0) as total FROM team_rewards WHERE wallet_address = ?',
                [walletAddr]
            );
            const subBrokerStats = await getSubBrokerStats(walletAddr);
            const currentRequirement = LEVEL_REQUIREMENTS[brokerLevel] || LEVEL_REQUIREMENTS[0];
            const targetSubLevel = `level${currentRequirement.subBrokerLevel}`;
            const currentSubBrokers = brokerLevel >= 1 && brokerLevel < 5
                ? subBrokerStats[targetSubLevel] || 0
                : 0;

            const adjustments = await getInviteAdjustments(dbQuery, walletAddr);
            const dailyIncomeAdj = parseFloat(adjustments.daily_income_adj) || 0;
            const teamMembersAdj = parseInt(adjustments.team_members_adj) || 0;
            const totalRechargeAdj = parseFloat(adjustments.total_recharge_adj) || 0;
            const directMembersAdj = parseInt(adjustments.direct_members_adj) || 0;
            const totalWithdrawalsAdj = parseFloat(adjustments.total_withdrawals_adj) || 0;
            const referralRewardAdj = parseFloat(adjustments.referral_reward_adj) || 0;
            const teamRewardAdj = parseFloat(adjustments.team_reward_adj) || 0;
            const totalPerformance = totalRecharge;
            const totalPerformanceAdj = totalRechargeAdj;

            res.json({
                success: true,
                data: {
                    direct_members: allDirectMembers + directMembersAdj,
                    active_referrals: activeReferrals,
                    qualified_direct_members: brokerLevel >= 1 ? directCounts.lv2_5 : directCounts.lv1,
                    team_members: teamMembers + teamMembersAdj,
                    total_recharge: (totalRecharge + totalRechargeAdj).toFixed(4),
                    total_withdrawals: (totalWithdrawals + totalWithdrawalsAdj).toFixed(4),
                    total_performance: (totalPerformance + totalPerformanceAdj).toFixed(4),
                    broker_level: brokerLevel,
                    team_daily_income: (teamDailyIncome + dailyIncomeAdj).toFixed(4),
                    total_referral_reward: ((parseFloat(referralRewardResult[0]?.total) || 0) + referralRewardAdj).toFixed(4),
                    total_team_reward: ((parseFloat(teamRewardResult[0]?.total) || 0) + teamRewardAdj).toFixed(4),
                    invite_target: currentRequirement.directMembers,
                    next_level: currentRequirement.nextLevel,
                    requirements: {
                        direct_members: currentRequirement.directMembers,
                        sub_brokers: currentRequirement.subBrokers,
                        sub_broker_level: currentRequirement.subBrokerLevel,
                        performance: currentRequirement.performance
                    },
                    progress: {
                        direct_members: brokerLevel >= 1 ? directCounts.lv2_5 : directCounts.lv1,
                        sub_brokers: currentSubBrokers,
                        performance: (totalPerformance + totalPerformanceAdj).toFixed(4)
                    }
                }
            });

            if (brokerLevel > 0) {
                processWalletDailyDividend(walletAddr)
                    .then(result => {
                        if (result.rewarded) {
                            console.log(`[Invite Stats] ✅ 即时发放分红成功: ${walletAddr.slice(0, 10)}... Level${result.level} +${result.amount} USDT`);
                        }
                    })
                    .catch(err => {
                        console.error(`[Invite Stats] ❌ 即时发放分红失败: ${walletAddr.slice(0, 10)}...`, err.message);
                    });
            }
        } catch (error) {
            console.error('获取邀请统计失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch invite stats',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/level-counts', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            res.json({
                success: true,
                data: await buildLevelCounts(dbQuery, wallet_address.toLowerCase())
            });
        } catch (error) {
            console.error('获取层级成员数量失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch level counts',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/team-stats', async (req, res) => {
        try {
            const { wallet_address } = req.query;
            if (!wallet_address) {
                return res.status(400).json({ success: false, message: 'wallet_address is required' });
            }

            res.json({
                success: true,
                data: await buildTeamStats(dbQuery, wallet_address.toLowerCase())
            });
        } catch (error) {
            console.error('[API] Get team stats error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch team stats',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
