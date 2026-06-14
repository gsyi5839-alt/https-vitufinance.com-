import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';

class ReferralGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    addNode(walletAddress, profit = 0) {
        if (!this.nodes.has(walletAddress)) {
            this.nodes.set(walletAddress, {
                profit,
                parent: null,
                children: []
            });
        } else {
            this.nodes.get(walletAddress).profit = profit;
        }
    }

    addEdge(referrer, referee) {
        this.addNode(referrer);
        this.addNode(referee);

        const referrerNode = this.nodes.get(referrer);
        const refereeNode = this.nodes.get(referee);

        refereeNode.parent = referrer;
        referrerNode.children.push(referee);

        this.edges.push({ from: referrer, to: referee });
    }

    calculateUpstreamRewards(walletAddress, type = 'CEX') {
        const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
        const maxLevel = rates.length;
        const rewards = [];

        const node = this.nodes.get(walletAddress);
        if (!node) return { rewards: [], total: 0 };

        const profit = node.profit;
        let current = node.parent;
        let level = 1;

        while (current && level <= maxLevel) {
            const rate = rates[level - 1];
            const reward = profit * rate;
            rewards.push({
                level,
                wallet: current,
                rate,
                reward
            });

            const parentNode = this.nodes.get(current);
            current = parentNode ? parentNode.parent : null;
            level++;
        }

        const total = rewards.reduce((sum, reward) => sum + reward.reward, 0);
        return { rewards, total };
    }

    calculateDownstreamContribution(walletAddress, type = 'CEX') {
        const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;
        const maxLevel = rates.length;
        const contributions = [];
        let totalReward = 0;

        const queue = [{ wallet: walletAddress, level: 0 }];
        const visited = new Set([walletAddress]);

        while (queue.length > 0) {
            const { wallet, level } = queue.shift();
            const node = this.nodes.get(wallet);

            if (!node) continue;

            if (level > 0 && level <= maxLevel) {
                const rate = rates[level - 1];
                const reward = node.profit * rate;
                contributions.push({
                    level,
                    wallet,
                    profit: node.profit,
                    rate,
                    reward
                });
                totalReward += reward;
            }

            for (const child of node.children) {
                if (!visited.has(child) && level + 1 <= maxLevel) {
                    visited.add(child);
                    queue.push({ wallet: child, level: level + 1 });
                }
            }
        }

        return { contributions, totalReward };
    }

    getStatistics() {
        const totalNodes = this.nodes.size;
        const totalEdges = this.edges.length;
        let maxDepth = 0;
        let maxChildren = 0;
        let totalProfit = 0;

        for (const node of this.nodes.values()) {
            totalProfit += node.profit;
            maxChildren = Math.max(maxChildren, node.children.length);

            let depth = 0;
            let current = node.parent;
            while (current) {
                depth++;
                current = this.nodes.get(current)?.parent;
            }
            maxDepth = Math.max(maxDepth, depth);
        }

        return {
            totalNodes,
            totalEdges,
            maxDepth,
            maxChildren,
            totalProfit,
            avgProfit: totalNodes > 0 ? totalProfit / totalNodes : 0
        };
    }
}

export {
    ReferralGraph
};
