/**
 * Advanced referral rewards algorithms.
 *
 * This module keeps the public import path stable while the implementation is
 * split by responsibility into focused files.
 */

import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';
import {
    ReferralNode,
    calculateTreeRewards
} from './referralTreeAlgorithms.js';
import {
    optimizeReferralAllocation,
    batchCalculateRewards
} from './referralBatchAlgorithms.js';
import { monteCarloSimulation } from './referralSimulation.js';
import { ReferralGraph } from './referralGraph.js';
import {
    deriveFormulas,
    numericalValidation,
    generateAdvancedReport
} from './referralFormulaReports.js';

export {
    ReferralNode,
    ReferralGraph,
    calculateTreeRewards,
    optimizeReferralAllocation,
    batchCalculateRewards,
    monteCarloSimulation,
    deriveFormulas,
    numericalValidation,
    generateAdvancedReport,
    CEX_RATES,
    DEX_RATES
};

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    generateAdvancedReport();

    console.log('【额外测试：推荐树计算】');
    const root = new ReferralNode('ROOT', 0, 0);
    const child1 = root.addChild(new ReferralNode('A', 100));
    const child2 = root.addChild(new ReferralNode('B', 200));
    child1.addChild(new ReferralNode('A1', 80));
    child1.addChild(new ReferralNode('A2', 60));
    child2.addChild(new ReferralNode('B1', 90));

    const treeResult = calculateTreeRewards(root, 'CEX');
    console.log('推荐树奖励计算:');
    treeResult.details.forEach((detail) => {
        if (detail.count > 0) {
            console.log(
                `  ${detail.level}级: ${detail.count}人, 总收益${detail.totalProfit}, 奖励${detail.totalReward.toFixed(4)} (${detail.ratePercent}%)`
            );
        }
    });
    console.log(`  总奖励: ${treeResult.totalReward.toFixed(4)} USDT`);

    console.log('\n【推荐网络图测试】');
    const graph = new ReferralGraph();
    graph.addNode('ROOT', 0);
    graph.addEdge('ROOT', 'A');
    graph.addEdge('ROOT', 'B');
    graph.addEdge('A', 'A1');
    graph.addEdge('A', 'A2');
    graph.addEdge('B', 'B1');
    graph.nodes.get('A').profit = 100;
    graph.nodes.get('B').profit = 200;
    graph.nodes.get('A1').profit = 80;
    graph.nodes.get('A2').profit = 60;
    graph.nodes.get('B1').profit = 90;

    const graphStats = graph.getStatistics();
    console.log('网络统计:', graphStats);

    const downstream = graph.calculateDownstreamContribution('ROOT', 'CEX');
    console.log(`ROOT的下线贡献奖励: ${downstream.totalReward.toFixed(4)} USDT`);
}
