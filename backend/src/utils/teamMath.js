/**
 * 团队奖励数学模型 - Team Rewards Mathematical Model
 * 
 * 本模块提供团队经纪人等级系统的数学计算、分析和验证工具
 * 
 * 等级体系：
 * - 1级经纪人：直推5人，业绩>1,000 USDT
 * - 2级经纪人：直推10人，2名1级经纪人，业绩>5,000 USDT
 * - 3级经纪人：直推20人，2名2级经纪人，业绩>20,000 USDT
 * - 4级经纪人：直推30人，2名3级经纪人，业绩>80,000 USDT
 * - 5级经纪人：直推50人，2名4级经纪人，业绩>200,000 USDT
 */

// ============================================================================
// 常量定义 - 经纪人等级配置
// ============================================================================

/**
 * 经纪人等级配置表
 * 
 * 数学模型：
 * - minDirectReferrals: 最小直推人数要求 (购买>=20U机器人)
 * - minSubBrokers: 最小下级经纪人数量 (需要几名低一级经纪人)
 * - minTeamPerformance: 最小团队业绩要求 (USDT)
 * - dailyDividend: 每日分红 (USDT)
 * - monthlyIncome: 每月收入 (USDT)
 * - dailyWLD: 每日可兑换WLD数量
 */
const BROKER_LEVELS = [
    {
        level: 0,
        name: '普通用户',
        minDirectReferrals: 0,
        minSubBrokers: 0,
        subBrokerLevel: 0,
        minTeamPerformance: 0,
        dailyDividend: 0,
        monthlyIncome: 0,
        dailyWLD: 0
    },
    {
        level: 1,
        name: '一级经纪人',
        minDirectReferrals: 5,      // 直推5人
        minSubBrokers: 0,           // 无下级经纪人要求
        subBrokerLevel: 0,          // 无要求
        minTeamPerformance: 1000,   // 业绩>1,000 USDT
        dailyDividend: 5,           // 每日分红5 USDT
        monthlyIncome: 150,         // 每月150 USDT
        dailyWLD: 1                 // 每日1 WLD
    },
    {
        level: 2,
        name: '二级经纪人',
        minDirectReferrals: 10,     // 直推10人
        minSubBrokers: 2,           // 需要2名下级经纪人
        subBrokerLevel: 1,          // 需要1级经纪人
        minTeamPerformance: 5000,   // 业绩>5,000 USDT
        dailyDividend: 15,          // 每日分红15 USDT
        monthlyIncome: 450,         // 每月450 USDT
        dailyWLD: 2                 // 每日2 WLD
    },
    {
        level: 3,
        name: '三级经纪人',
        minDirectReferrals: 20,     // 直推20人
        minSubBrokers: 2,           // 需要2名下级经纪人
        subBrokerLevel: 2,          // 需要2级经纪人
        minTeamPerformance: 20000,  // 业绩>20,000 USDT
        dailyDividend: 60,          // 每日分红60 USDT
        monthlyIncome: 1800,        // 每月1,800 USDT
        dailyWLD: 3                 // 每日3 WLD
    },
    {
        level: 4,
        name: '四级经纪人',
        minDirectReferrals: 30,     // 直推30人
        minSubBrokers: 2,           // 需要2名下级经纪人
        subBrokerLevel: 3,          // 需要3级经纪人
        minTeamPerformance: 80000,  // 业绩>80,000 USDT
        dailyDividend: 300,         // 每日分红300 USDT
        monthlyIncome: 9000,        // 每月9,000 USDT
        dailyWLD: 5                 // 每日5 WLD
    },
    {
        level: 5,
        name: '五级经纪人',
        minDirectReferrals: 50,     // 直推50人
        minSubBrokers: 2,           // 需要2名下级经纪人
        subBrokerLevel: 4,          // 需要4级经纪人
        minTeamPerformance: 200000, // 业绩>200,000 USDT
        dailyDividend: 1000,        // 每日分红1,000 USDT
        monthlyIncome: 30000,       // 每月30,000 USDT
        dailyWLD: 10                // 每日10 WLD
    }
];

/**
 * 最低购买金额要求（只有>=20U的机器人才计入团队）
 * 注：与充值最低金额保持一致
 */
const MIN_ROBOT_PURCHASE = 20;

// ============================================================================
// 核心计算函数
// ============================================================================

/**
 * 获取经纪人等级配置
 * 
 * @param {number} level - 等级 (0-5)
 * @returns {Object} 等级配置
 */
function getBrokerLevelConfig(level) {
    if (level < 0 || level > 5) {
        return BROKER_LEVELS[0]; // 返回普通用户配置
    }
    return BROKER_LEVELS[level];
}

/**
 * 计算用户当前应该达到的经纪人等级
 * 
 * 算法：从最高级别向下检查，返回第一个满足条件的等级
 * 
 * @param {Object} userData - 用户数据
 * @param {number} userData.directReferrals - 合格直推人数 (购买>=100U机器人)
 * @param {number} userData.teamPerformance - 团队总业绩
 * @param {Array<number>} userData.subBrokerCounts - 各级别经纪人数量 [0级数量, 1级数量, 2级数量, ...]
 * @returns {Object} 等级评估结果
 */
function calculateBrokerLevel(userData) {
    const { directReferrals = 0, teamPerformance = 0, subBrokerCounts = [] } = userData;
    
    let qualifiedLevel = 0;
    const evaluations = [];
    
    // 从高到低检查各等级
    for (let level = 5; level >= 1; level--) {
        const config = BROKER_LEVELS[level];
        const evaluation = evaluateLevelRequirements(
            level, 
            directReferrals, 
            teamPerformance, 
            subBrokerCounts
        );
        
        evaluations.push(evaluation);
        
        if (evaluation.qualified && qualifiedLevel === 0) {
            qualifiedLevel = level;
        }
    }
    
    return {
        currentLevel: qualifiedLevel,
        levelName: BROKER_LEVELS[qualifiedLevel].name,
        config: BROKER_LEVELS[qualifiedLevel],
        evaluations: evaluations.reverse(), // 从1级到5级排列
        userData
    };
}

/**
 * 评估单个等级的要求是否满足
 * 
 * 数学公式：
 * qualified = (directReferrals >= minDirectReferrals) 
 *          && (teamPerformance > minTeamPerformance)
 *          && (subBrokerCount >= minSubBrokers)
 * 
 * @param {number} level - 目标等级
 * @param {number} directReferrals - 合格直推人数
 * @param {number} teamPerformance - 团队总业绩
 * @param {Array<number>} subBrokerCounts - 各级别经纪人数量
 * @returns {Object} 评估结果
 */
function evaluateLevelRequirements(level, directReferrals, teamPerformance, subBrokerCounts) {
    const config = BROKER_LEVELS[level];
    
    // 检查直推人数
    const directCheck = directReferrals >= config.minDirectReferrals;
    const directGap = Math.max(0, config.minDirectReferrals - directReferrals);
    
    // 检查团队业绩
    const performanceCheck = teamPerformance > config.minTeamPerformance;
    const performanceGap = Math.max(0, config.minTeamPerformance - teamPerformance + 1);
    
    // 检查下级经纪人
    let subBrokerCheck = true;
    let subBrokerGap = 0;
    
    if (config.minSubBrokers > 0) {
        const requiredLevel = config.subBrokerLevel;
        const currentSubBrokers = subBrokerCounts[requiredLevel] || 0;
        subBrokerCheck = currentSubBrokers >= config.minSubBrokers;
        subBrokerGap = Math.max(0, config.minSubBrokers - currentSubBrokers);
    }
    
    const qualified = directCheck && performanceCheck && subBrokerCheck;
    
    return {
        level,
        levelName: config.name,
        qualified,
        checks: {
            directReferrals: {
                required: config.minDirectReferrals,
                current: directReferrals,
                passed: directCheck,
                gap: directGap
            },
            teamPerformance: {
                required: config.minTeamPerformance,
                current: teamPerformance,
                passed: performanceCheck,
                gap: performanceGap
            },
            subBrokers: {
                required: config.minSubBrokers,
                requiredLevel: config.subBrokerLevel,
                current: subBrokerCounts[config.subBrokerLevel] || 0,
                passed: subBrokerCheck,
                gap: subBrokerGap
            }
        },
        rewards: {
            dailyDividend: config.dailyDividend,
            monthlyIncome: config.monthlyIncome,
            dailyWLD: config.dailyWLD
        }
    };
}

/**
 * 计算经纪人奖励
 * 
 * 数学公式：
 * - 日奖励 = dailyDividend
 * - 月奖励 = monthlyIncome (= dailyDividend × 30)
 * - WLD奖励 = dailyWLD
 * 
 * @param {number} level - 经纪人等级
 * @param {number} days - 计算天数
 * @returns {Object} 奖励计算结果
 */
function calculateBrokerRewards(level, days = 1) {
    const config = getBrokerLevelConfig(level);
    
    return {
        level,
        levelName: config.name,
        days,
        rewards: {
            dailyDividend: config.dailyDividend,
            totalDividend: config.dailyDividend * days,
            dailyWLD: config.dailyWLD,
            totalWLD: config.dailyWLD * days
        },
        monthly: {
            income: config.monthlyIncome,
            days: 30,
            verification: config.dailyDividend * 30 === config.monthlyIncome 
                ? '✓ 验证通过' 
                : `⚠ 不一致: ${config.dailyDividend * 30} vs ${config.monthlyIncome}`
        }
    };
}

// ============================================================================
// 升级/降级分析函数
// ============================================================================

/**
 * 计算升级到下一等级需要的差距
 * 
 * @param {Object} userData - 用户数据
 * @returns {Object} 升级差距分析
 */
function calculateUpgradeGap(userData) {
    const currentResult = calculateBrokerLevel(userData);
    const currentLevel = currentResult.currentLevel;
    
    if (currentLevel >= 5) {
        return {
            currentLevel: 5,
            currentLevelName: '五级经纪人',
            isMaxLevel: true,
            message: '您已达到最高等级！'
        };
    }
    
    const nextLevel = currentLevel + 1;
    const nextConfig = BROKER_LEVELS[nextLevel];
    const evaluation = currentResult.evaluations[nextLevel - 1];
    
    return {
        currentLevel,
        currentLevelName: BROKER_LEVELS[currentLevel].name,
        nextLevel,
        nextLevelName: nextConfig.name,
        isMaxLevel: false,
        requirements: evaluation.checks,
        upgradeNeeded: {
            directReferrals: evaluation.checks.directReferrals.gap,
            teamPerformance: evaluation.checks.teamPerformance.gap,
            subBrokers: evaluation.checks.subBrokers.gap
        },
        nextLevelRewards: {
            dailyDividend: nextConfig.dailyDividend,
            monthlyIncome: nextConfig.monthlyIncome,
            dailyWLD: nextConfig.dailyWLD
        },
        rewardIncrease: {
            dailyDividend: nextConfig.dailyDividend - BROKER_LEVELS[currentLevel].dailyDividend,
            monthlyIncome: nextConfig.monthlyIncome - BROKER_LEVELS[currentLevel].monthlyIncome,
            dailyWLD: nextConfig.dailyWLD - BROKER_LEVELS[currentLevel].dailyWLD
        }
    };
}

/**
 * 检查是否会降级
 * 
 * @param {number} currentLevel - 当前等级
 * @param {Object} userData - 用户数据
 * @returns {Object} 降级风险分析
 */
function checkDemotionRisk(currentLevel, userData) {
    if (currentLevel <= 0) {
        return {
            currentLevel: 0,
            atRisk: false,
            message: '您是普通用户，无降级风险'
        };
    }
    
    const newResult = calculateBrokerLevel(userData);
    const newLevel = newResult.currentLevel;
    
    if (newLevel < currentLevel) {
        return {
            currentLevel,
            newLevel,
            atRisk: true,
            willDemote: true,
            demotionLevels: currentLevel - newLevel,
            reason: '未达到当前等级的维持条件',
            requirements: newResult.evaluations[currentLevel - 1].checks
        };
    }
    
    return {
        currentLevel,
        newLevel,
        atRisk: false,
        willDemote: false,
        message: '您的等级安全，无降级风险'
    };
}

// ============================================================================
// 团队业绩分析函数
// ============================================================================

/**
 * 分析团队结构
 * 
 * @param {Array} teamMembers - 团队成员数据
 * @returns {Object} 团队结构分析
 */
function analyzeTeamStructure(teamMembers) {
    // 统计各等级经纪人数量
    const brokerCounts = [0, 0, 0, 0, 0, 0]; // 0-5级
    
    // 统计合格成员（购买>=100U）
    let qualifiedMembers = 0;
    let totalPerformance = 0;
    
    for (const member of teamMembers) {
        const purchaseAmount = member.purchaseAmount || 0;
        
        if (purchaseAmount >= MIN_ROBOT_PURCHASE) {
            qualifiedMembers++;
        }
        
        totalPerformance += purchaseAmount;
        
        const brokerLevel = member.brokerLevel || 0;
        if (brokerLevel >= 0 && brokerLevel <= 5) {
            brokerCounts[brokerLevel]++;
        }
    }
    
    return {
        totalMembers: teamMembers.length,
        qualifiedMembers,
        unqualifiedMembers: teamMembers.length - qualifiedMembers,
        totalPerformance,
        brokerCounts,
        brokerBreakdown: {
            level0: brokerCounts[0],
            level1: brokerCounts[1],
            level2: brokerCounts[2],
            level3: brokerCounts[3],
            level4: brokerCounts[4],
            level5: brokerCounts[5]
        }
    };
}

/**
 * 预测收益潜力
 * 
 * @param {number} currentLevel - 当前等级
 * @param {number} projectedDays - 预测天数
 * @returns {Object} 收益预测
 */
function projectEarnings(currentLevel, projectedDays = 30) {
    const config = getBrokerLevelConfig(currentLevel);
    
    const dailyTotal = config.dailyDividend;
    const projectedDividend = dailyTotal * projectedDays;
    const projectedWLD = config.dailyWLD * projectedDays;
    
    // 与各等级对比
    const comparison = [];
    for (let level = 1; level <= 5; level++) {
        const levelConfig = BROKER_LEVELS[level];
        comparison.push({
            level,
            levelName: levelConfig.name,
            projectedDividend: levelConfig.dailyDividend * projectedDays,
            projectedWLD: levelConfig.dailyWLD * projectedDays,
            differenceFromCurrent: (levelConfig.dailyDividend - config.dailyDividend) * projectedDays
        });
    }
    
    return {
        currentLevel,
        levelName: config.name,
        projectedDays,
        projected: {
            dividendTotal: projectedDividend,
            wldTotal: projectedWLD
        },
        daily: {
            dividend: config.dailyDividend,
            wld: config.dailyWLD
        },
        comparison
    };
}

// ============================================================================
// 数学公式推导
// ============================================================================

/**
 * 生成等级要求的数学公式
 */
function deriveTeamFormulas() {
    return {
        title: '团队经纪人等级数学模型',
        
        // 等级判定公式
        levelDetermination: {
            formula: 'L = max{n : C_direct(n) ∧ C_perf(n) ∧ C_broker(n)}',
            description: '用户等级 = 满足所有条件的最高等级',
            conditions: {
                'C_direct(n)': 'directReferrals >= minDirectReferrals[n]',
                'C_perf(n)': 'teamPerformance > minTeamPerformance[n]',
                'C_broker(n)': 'subBrokerCount[n-1] >= 2 (for n >= 2)'
            }
        },
        
        // 奖励计算公式
        rewardCalculation: {
            daily: 'R_daily = dailyDividend[L]',
            monthly: 'R_monthly = dailyDividend[L] × 30',
            wld: 'WLD_daily = dailyWLD[L]',
            total: 'R_total(days) = R_daily × days'
        },
        
        // 等级配置表
        levelTable: BROKER_LEVELS.slice(1).map(config => ({
            level: config.level,
            name: config.name,
            directRequired: `≥ ${config.minDirectReferrals}`,
            performanceRequired: `> ${config.minTeamPerformance.toLocaleString()} USDT`,
            subBrokerRequired: config.minSubBrokers > 0 
                ? `≥ ${config.minSubBrokers} 名 ${config.subBrokerLevel}级经纪人`
                : '无',
            rewards: `${config.dailyDividend}/日, ${config.monthlyIncome}/月, ${config.dailyWLD} WLD/日`
        }))
    };
}

/**
 * 验证等级配置的数学一致性
 */
function validateLevelConfiguration() {
    const issues = [];
    
    for (let i = 1; i <= 5; i++) {
        const config = BROKER_LEVELS[i];
        
        // 验证月收入 = 日收入 × 30
        const expectedMonthly = config.dailyDividend * 30;
        if (expectedMonthly !== config.monthlyIncome) {
            issues.push({
                level: i,
                issue: `月收入不一致: ${expectedMonthly} vs ${config.monthlyIncome}`,
                severity: 'warning'
            });
        }
        
        // 验证等级递增
        if (i > 1) {
            const prevConfig = BROKER_LEVELS[i - 1];
            if (config.minDirectReferrals <= prevConfig.minDirectReferrals) {
                issues.push({
                    level: i,
                    issue: '直推要求未递增',
                    severity: 'error'
                });
            }
            if (config.minTeamPerformance <= prevConfig.minTeamPerformance) {
                issues.push({
                    level: i,
                    issue: '业绩要求未递增',
                    severity: 'error'
                });
            }
        }
    }
    
    return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        summary: issues.length === 0 
            ? '✓ 所有等级配置验证通过' 
            : `⚠ 发现 ${issues.length} 个问题`
    };
}

// ============================================================================
// 报告生成
// ============================================================================

/**
 * 生成完整的团队数学分析报告
 */
function generateTeamReport(userData = null) {
    const report = {
        title: '团队经纪人等级系统分析报告',
        timestamp: new Date().toISOString(),
        
        // 配置验证
        configValidation: validateLevelConfiguration(),
        
        // 数学公式
        formulas: deriveTeamFormulas(),
        
        // 等级配置一览
        levelConfigs: BROKER_LEVELS.slice(1).map(config => ({
            level: config.level,
            name: config.name,
            requirements: {
                directReferrals: config.minDirectReferrals,
                teamPerformance: config.minTeamPerformance,
                subBrokers: config.minSubBrokers,
                subBrokerLevel: config.subBrokerLevel
            },
            rewards: {
                dailyDividend: config.dailyDividend,
                monthlyIncome: config.monthlyIncome,
                dailyWLD: config.dailyWLD
            }
        }))
    };
    
    // 如果提供了用户数据，添加用户分析
    if (userData) {
        report.userAnalysis = {
            levelEvaluation: calculateBrokerLevel(userData),
            upgradeGap: calculateUpgradeGap(userData),
            earningsProjection: projectEarnings(
                calculateBrokerLevel(userData).currentLevel, 
                30
            )
        };
    }
    
    return report;
}

// ============================================================================
// 导出模块
// ============================================================================

export {
    // 常量
    BROKER_LEVELS,
    MIN_ROBOT_PURCHASE,
    
    // 核心函数
    getBrokerLevelConfig,
    calculateBrokerLevel,
    evaluateLevelRequirements,
    calculateBrokerRewards,
    
    // 升级/降级分析
    calculateUpgradeGap,
    checkDemotionRisk,
    
    // 团队分析
    analyzeTeamStructure,
    projectEarnings,
    
    // 数学公式
    deriveTeamFormulas,
    validateLevelConfiguration,
    
    // 报告生成
    generateTeamReport
};

// ============================================================================
// 命令行测试
// ============================================================================

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    console.log('\n' + '='.repeat(60));
    console.log('    团队经纪人等级系统 - 数学模型测试');
    console.log('='.repeat(60) + '\n');

    // 1. 配置验证
    console.log('【1. 配置验证】');
    const validation = validateLevelConfiguration();
    console.log('   ' + validation.summary);
    console.log('');

    // 2. 等级配置一览
    console.log('【2. 等级配置一览】');
    console.log('   ┌──────┬──────────┬──────────┬────────────┬──────────┬──────────┬────────┐');
    console.log('   │ 等级 │ 直推人数 │ 下级经纪 │ 团队业绩   │ 日分红   │ 月收入   │ 日WLD  │');
    console.log('   ├──────┼──────────┼──────────┼────────────┼──────────┼──────────┼────────┤');
    for (let i = 1; i <= 5; i++) {
        const c = BROKER_LEVELS[i];
        const subReq = c.minSubBrokers > 0 ? `${c.minSubBrokers}名${c.subBrokerLevel}级` : '-';
        console.log(`   │  ${i}级 │ ≥${String(c.minDirectReferrals).padEnd(6)} │ ${subReq.padEnd(8)} │ >${String(c.minTeamPerformance).padStart(9)} │ ${String(c.dailyDividend).padStart(7)}$ │ ${String(c.monthlyIncome).padStart(7)}$ │ ${String(c.dailyWLD).padStart(5)}  │`);
    }
    console.log('   └──────┴──────────┴──────────┴────────────┴──────────┴──────────┴────────┘');
    console.log('');

    // 3. 模拟用户等级计算
    console.log('【3. 模拟用户等级计算】');
    const testUser = {
        directReferrals: 12,        // 12个合格直推
        teamPerformance: 8000,      // 8000 USDT业绩
        subBrokerCounts: [5, 3, 0, 0, 0, 0]  // 5个普通用户，3个1级经纪人
    };
    console.log('   测试用户数据:');
    console.log(`     - 合格直推: ${testUser.directReferrals}人`);
    console.log(`     - 团队业绩: ${testUser.teamPerformance} USDT`);
    console.log(`     - 1级经纪人: ${testUser.subBrokerCounts[1]}人`);
    console.log('');

    const result = calculateBrokerLevel(testUser);
    console.log(`   计算结果: ${result.levelName} (${result.currentLevel}级)`);
    console.log('');

    // 4. 升级差距分析
    console.log('【4. 升级差距分析】');
    const upgradeGap = calculateUpgradeGap(testUser);
    if (!upgradeGap.isMaxLevel) {
        console.log(`   升级到 ${upgradeGap.nextLevelName} 还需要:`);
        console.log(`     - 直推人数: +${upgradeGap.upgradeNeeded.directReferrals}人`);
        console.log(`     - 团队业绩: +${upgradeGap.upgradeNeeded.teamPerformance} USDT`);
        console.log(`     - 下级经纪人: +${upgradeGap.upgradeNeeded.subBrokers}人`);
        console.log(`   升级后奖励增加:`);
        console.log(`     - 日分红: +${upgradeGap.rewardIncrease.dailyDividend} USDT/天`);
        console.log(`     - 月收入: +${upgradeGap.rewardIncrease.monthlyIncome} USDT/月`);
    }
    console.log('');

    // 5. 30天收益预测
    console.log('【5. 30天收益预测】');
    const projection = projectEarnings(result.currentLevel, 30);
    console.log(`   ${projection.levelName} 30天预计收益:`);
    console.log(`     - 分红总计: ${projection.projected.dividendTotal} USDT`);
    console.log(`     - WLD总计: ${projection.projected.wldTotal} WLD`);

    console.log('\n' + '='.repeat(60) + '\n');
}

