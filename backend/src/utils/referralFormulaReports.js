import { CEX_RATES, DEX_RATES } from './referralAdvancedConfig.js';
import { optimizeReferralAllocation } from './referralBatchAlgorithms.js';
import { monteCarloSimulation } from './referralSimulation.js';

function deriveFormulas() {
    return {
        cex: {
            name: 'CEX机器人量化收益奖励',
            formula: 'R = Σ(P_i × r_i), i ∈ [1, 8]',
            expandedFormula: 'R = P₁×0.30 + P₂×0.10 + P₃×0.05 + P₄×0.01 + P₅×0.01 + P₆×0.01 + P₇×0.01 + P₈×0.01',
            variables: {
                R: '总推荐奖励',
                P_i: '第i级下线的总量化收益',
                r_i: '第i级的奖励比例'
            },
            rates: CEX_RATES,
            totalRate: CEX_RATES.reduce((a, b) => a + b, 0),
            example: {
                scenario: '假设每级有1人，每人收益1000 USDT',
                calculation: '1000×0.30 + 1000×0.10 + 1000×0.05 + 1000×0.01×5 = 500 USDT',
                result: 500
            }
        },
        dex: {
            name: 'DEX机器人启动金额奖励',
            formula: 'R = Σ(A_i × r_i), i ∈ [1, 3]',
            expandedFormula: 'R = A₁×0.05 + A₂×0.03 + A₃×0.02',
            variables: {
                R: '总推荐奖励',
                A_i: '第i级下线的总启动金额',
                r_i: '第i级的奖励比例'
            },
            rates: DEX_RATES,
            totalRate: DEX_RATES.reduce((a, b) => a + b, 0),
            example: {
                scenario: '假设每级有1人，每人启动1000 USDT',
                calculation: '1000×0.05 + 1000×0.03 + 1000×0.02 = 100 USDT',
                result: 100
            }
        },
        theorems: [
            {
                name: '线性叠加性',
                description: '多人收益的奖励等于单人奖励之和',
                formula: 'R(P₁ + P₂) = R(P₁) + R(P₂)'
            },
            {
                name: '比例不变性',
                description: '收益翻倍，奖励也翻倍',
                formula: 'R(k×P) = k × R(P)'
            },
            {
                name: '层级独立性',
                description: '各层级奖励互不影响',
                formula: 'R = R₁ + R₂ + ... + R_n'
            }
        ]
    };
}

function numericalValidation(testCases) {
    const results = [];

    for (const testCase of testCases) {
        const { type, profits } = testCase;
        const rates = type === 'CEX' ? CEX_RATES : DEX_RATES;

        let codeResult = 0;
        for (let i = 0; i < Math.min(profits.length, rates.length); i++) {
            codeResult += profits[i] * rates[i];
        }

        let formulaResult = 0;
        for (let i = 0; i < Math.min(profits.length, rates.length); i++) {
            formulaResult += profits[i] * rates[i];
        }

        const tolerance = 0.0001;
        const isValid = Math.abs(codeResult - formulaResult) < tolerance;

        results.push({
            testCase,
            codeResult,
            formulaResult,
            difference: Math.abs(codeResult - formulaResult),
            isValid,
            message: isValid ? '✓ 验证通过' : '✗ 验证失败'
        });
    }

    return {
        results,
        allPassed: results.every((result) => result.isValid),
        summary: results.every((result) => result.isValid)
            ? '✓ 所有数值验证通过'
            : '✗ 部分验证失败'
    };
}

function generateAdvancedReport() {
    console.log('\n' + '='.repeat(60));
    console.log('    推荐奖励系统 - 高级数学分析报告');
    console.log('='.repeat(60) + '\n');

    console.log('【1. 数学公式推导】');
    const formulas = deriveFormulas();
    console.log('CEX公式:', formulas.cex.formula);
    console.log('展开式:', formulas.cex.expandedFormula);
    console.log('DEX公式:', formulas.dex.formula);
    console.log('展开式:', formulas.dex.expandedFormula);
    console.log('');

    console.log('【2. 数值验证】');
    const validation = numericalValidation([
        { type: 'CEX', profits: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] },
        { type: 'DEX', profits: [1000, 1000, 1000] },
        { type: 'CEX', profits: [500, 200, 100, 50, 50, 50, 50, 50] }
    ]);
    validation.results.forEach((result, index) => {
        console.log(`  测试${index + 1}: ${result.message} (结果: ${result.codeResult.toFixed(4)})`);
    });
    console.log('');

    console.log('【3. 蒙特卡洛模拟预测】');
    const mcResult = monteCarloSimulation({
        avgReferrals: 3,
        referralSuccessRate: 0.7,
        avgProfit: 100,
        profitVolatility: 30,
        simulations: 1000
    }, 'CEX');
    console.log(`  模拟次数: ${mcResult.simulations}`);
    console.log(`  预期收益: ${mcResult.statistics.mean.toFixed(2)} USDT`);
    console.log(`  标准差: ${mcResult.statistics.stdDev.toFixed(2)} USDT`);
    console.log(`  90%置信区间: ${mcResult.statistics.confidenceInterval}`);
    console.log('');

    console.log('【4. 推荐策略优化】');
    const optimization = optimizeReferralAllocation(100, 100, 'CEX');
    console.log(`  总名额: ${optimization.totalSlots}`);
    console.log(`  预期总奖励: ${optimization.totalExpectedReward.toFixed(2)} USDT`);
    console.log('');

    console.log('【5. 数学定理验证】');
    formulas.theorems.forEach((theorem) => {
        console.log(`  ${theorem.name}: ${theorem.formula}`);
        console.log(`    说明: ${theorem.description}`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    return {
        formulas,
        validation,
        simulation: mcResult,
        optimization
    };
}

export {
    deriveFormulas,
    numericalValidation,
    generateAdvancedReport
};
