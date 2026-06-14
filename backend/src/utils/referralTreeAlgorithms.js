import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';

class ReferralNode {
    constructor(walletAddress, profit = 0, level = 0) {
        this.walletAddress = walletAddress;
        this.profit = profit;
        this.level = level;
        this.children = [];
        this.parent = null;
    }

    addChild(child) {
        child.parent = this;
        child.level = this.level + 1;
        this.children.push(child);
        return child;
    }

    getCountAtLevel(targetLevel) {
        if (this.level === targetLevel) return 1;
        if (this.level > targetLevel) return 0;

        return this.children.reduce(
            (sum, child) => sum + child.getCountAtLevel(targetLevel),
            0
        );
    }
}

function calculateTreeRewards(root, type = 'CEX') {
    const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
    const maxLevel = rates.length;
    const levelStats = new Array(maxLevel).fill(null).map(() => ({
        count: 0,
        totalProfit: 0,
        totalReward: 0
    }));

    function dfs(node) {
        if (node.level > 0 && node.level <= maxLevel) {
            const levelIndex = node.level - 1;
            levelStats[levelIndex].count++;
            levelStats[levelIndex].totalProfit += node.profit;
            levelStats[levelIndex].totalReward += node.profit * rates[levelIndex];
        }

        for (const child of node.children) {
            dfs(child);
        }
    }

    dfs(root);

    let totalReward = 0;
    const details = levelStats.map((stat, index) => {
        totalReward += stat.totalReward;
        return {
            level: index + 1,
            rate: rates[index],
            ratePercent: rates[index] * 100,
            count: stat.count,
            totalProfit: stat.totalProfit,
            totalReward: stat.totalReward,
            avgProfit: stat.count > 0 ? stat.totalProfit / stat.count : 0
        };
    });

    return {
        type,
        details,
        totalReward,
        algorithm: '递归树遍历 (DFS)',
        complexity: 'O(n)'
    };
}

export {
    ReferralNode,
    calculateTreeRewards
};
