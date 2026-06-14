/**
 * Team broker daily dividend cron public API.
 *
 * This file preserves the original import path and CLI config output while
 * moving implementation details into focused modules.
 */

import {
    BROKER_LEVELS,
    MIN_ROBOT_PURCHASE,
    MIN_ROBOT_PURCHASE_LV1,
    MIN_ROBOT_PURCHASE_LV2_5
} from '../utils/teamMath.js';
import { setDbQuery } from './teamDividendState.js';
import {
    calculateBrokerLevel,
    getSubBrokerCounts
} from './teamBrokerLevel.js';
import { processAllTeamDividends } from './teamDividendDaily.js';
import {
    processWalletDailyDividend,
    processUplineDailyDividends
} from './teamDividendInstant.js';
import {
    initTeamRewardsTable,
    initCronLogsTable
} from './teamDividendTables.js';
import {
    startTeamDividendCron,
    stopTeamDividendCron,
    manualProcessDividends
} from './teamDividendScheduler.js';

export {
    BROKER_LEVELS,
    MIN_ROBOT_PURCHASE,
    MIN_ROBOT_PURCHASE_LV1,
    MIN_ROBOT_PURCHASE_LV2_5,
    setDbQuery,
    initTeamRewardsTable,
    initCronLogsTable,
    calculateBrokerLevel,
    getSubBrokerCounts,
    processAllTeamDividends,
    processWalletDailyDividend,
    processUplineDailyDividends,
    startTeamDividendCron,
    stopTeamDividendCron,
    manualProcessDividends
};

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    console.log('\n' + '='.repeat(60));
    console.log('    团队经纪人每日分红 - 配置验证');
    console.log('='.repeat(60) + '\n');

    console.log('📊 等级配置一览:');
    console.log('┌──────┬──────────┬──────────┬────────────┬──────────┬────────┐');
    console.log('│ 等级 │ 直推人数 │ 下级经纪 │ 团队业绩   │ 日分红   │ 日WLD  │');
    console.log('├──────┼──────────┼──────────┼────────────┼──────────┼────────┤');
    for (let i = 1; i <= 5; i++) {
        const config = BROKER_LEVELS[i];
        const subReq = config.minSubBrokers > 0 ? `${config.minSubBrokers}名${config.subBrokerLevel}级` : '-';
        console.log(`│  ${i}级 │ ≥${String(config.minDirectReferrals).padEnd(6)} │ ${subReq.padEnd(8)} │ >${String(config.minTeamPerformance).padStart(9)} │ ${String(config.dailyDividend).padStart(7)}$ │ ${String(config.dailyWLD).padStart(5)}  │`);
    }
    console.log('└──────┴──────────┴──────────┴────────────┴──────────┴────────┘');

    console.log('\n📐 算法说明:');
    console.log('1. 合格成员门槛:');
    console.log('   - LV1: 购买 >= 20 USDT 机器人的用户');
    console.log('   - LV2-5: 购买 >= 100 USDT 机器人的用户');
    console.log('2. 等级判断: 从5级到1级依次检查，返回第一个满足的等级');
    console.log('3. 下级经纪人: 递归计算直推成员中各等级经纪人数量');
    console.log('4. 防重复: 每天只发放一次，通过日期检查防止重复');

    console.log('\n' + '='.repeat(60) + '\n');
}
