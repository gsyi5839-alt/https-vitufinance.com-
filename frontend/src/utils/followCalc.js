/**
 * ============================================================================
 * Follow 页面机器人数学工具集
 * ============================================================================
 * 
 * 用于 Follow 页面的 Grid 和 High 机器人收益计算
 * 
 * Grid 机器人特点：
 * - 固定价格
 * - 每24小时量化一次，获得日收益
 * - 到期返还本金
 * 
 * High 机器人特点：
 * - 范围价格（用户自定义投入金额）
 * - 只能量化一次
 * - 到期返还本金+利息
 */

// ============================================================================
// 常量定义
// ============================================================================

/**
 * Grid 机器人默认配置
 * 用于前端展示和计算，实际数据从API获取
 */
export const DEFAULT_GRID_CONFIG = {
    quantify_interval_hours: 24,  // 每24小时量化一次
    return_principal: true,        // 到期返还本金
    daily_limit: true              // 每日限购
};

/**
 * High 机器人默认配置
 */
export const DEFAULT_HIGH_CONFIG = {
    quantify_interval_hours: null, // null表示只能量化一次
    return_principal: true,         // 到期返还本金+利息
    daily_limit: true,              // 每日限购
    single_quantify: true           // 只能量化一次
};

// ============================================================================
// 核心计算函数
// ============================================================================

/**
 * 计算 Grid 机器人到期总收益
 * 公式：总收益 = 价格 × 日收益率 × 天数
 * 
 * @param {number} price - 机器人价格
 * @param {number} dailyProfitRate - 日收益率（百分比，如 1.5 表示 1.5%）
 * @param {number} durationHours - 运行周期（小时）
 * @returns {object} 计算结果
 */
export function calculateGridReturn(price, dailyProfitRate, durationHours) {
    const durationDays = durationHours / 24;
    const dailyRate = dailyProfitRate / 100;
    
    // 每日收益 = 价格 × 日收益率
    const dailyEarnings = price * dailyRate;
    
    // 总收益 = 每日收益 × 天数
    const totalProfit = dailyEarnings * durationDays;
    
    // 到期总返还 = 本金 + 总收益
    const totalReturn = price + totalProfit;
    
    // 总收益率
    const totalReturnRate = dailyProfitRate * durationDays;
    
    return {
        price,                          // 投入金额
        dailyProfitRate,               // 日收益率 (%)
        durationDays,                  // 运行天数
        durationHours,                 // 运行小时数
        dailyEarnings: round(dailyEarnings, 4),        // 每日收益
        totalProfit: round(totalProfit, 2),            // 总收益
        totalReturn: round(totalReturn, 2),            // 到期总返还
        totalReturnRate: round(totalReturnRate, 2),   // 总收益率 (%)
        quantifyTimes: durationDays,                   // 可量化次数
        formula: `${price} × ${dailyProfitRate}% × ${durationDays}天 = ${round(totalProfit, 2)} USDT`
    };
}

/**
 * 计算 High 机器人到期总收益
 * 公式：到期返还 = 本金 × (1 + 日收益率 × 天数)
 * 
 * @param {number} price - 投入金额
 * @param {number} dailyProfitRate - 日收益率（百分比）
 * @param {number} durationHours - 运行周期（小时）
 * @returns {object} 计算结果
 */
export function calculateHighReturn(price, dailyProfitRate, durationHours) {
    const durationDays = durationHours / 24;
    const dailyRate = dailyProfitRate / 100;
    
    // 总收益率 = 日收益率 × 天数
    const totalReturnRate = dailyProfitRate * durationDays;
    
    // 总收益 = 本金 × 总收益率
    const totalProfit = price * (totalReturnRate / 100);
    
    // 到期返还 = 本金 + 总收益
    const totalReturn = price + totalProfit;
    
    return {
        price,                          // 投入金额
        dailyProfitRate,               // 日收益率 (%)
        durationDays,                  // 运行天数
        durationHours,                 // 运行小时数
        totalReturnRate: round(totalReturnRate, 2),   // 总收益率 (%)
        totalProfit: round(totalProfit, 4),            // 总收益
        totalReturn: round(totalReturn, 4),            // 到期总返还
        quantifyTimes: 1,                              // 只能量化一次
        formula: `${price} × (1 + ${totalReturnRate}%) = ${round(totalReturn, 4)} USDT`
    };
}

/**
 * 计算单次量化收益
 * 
 * @param {number} price - 投入金额
 * @param {number} dailyProfitRate - 日收益率（百分比）
 * @param {number} quantifyIntervalHours - 量化间隔（小时），null表示只能量化一次
 * @returns {number} 单次量化收益
 */
export function calculateQuantifyEarnings(price, dailyProfitRate, quantifyIntervalHours = 24) {
    if (quantifyIntervalHours === null) {
        // High 机器人：到期一次性返还
        return 0;
    }
    
    const dailyRate = dailyProfitRate / 100;
    const intervalDays = quantifyIntervalHours / 24;
    
    // 单次量化收益 = 价格 × 日收益率 × (间隔/24)
    return round(price * dailyRate * intervalDays, 4);
}

/**
 * 预估收益模拟器
 * 模拟不同投入金额的收益情况
 * 
 * @param {object} robotConfig - 机器人配置
 * @param {number[]} amounts - 要模拟的金额列表
 * @returns {object[]} 模拟结果列表
 */
export function simulateReturns(robotConfig, amounts) {
    const { daily_profit, duration_hours, robot_type, min_price, max_price } = robotConfig;
    
    return amounts.map(amount => {
        // High 机器人验证金额范围
        if (robot_type === 'high') {
            if (amount < min_price || amount > max_price) {
                return {
                    amount,
                    valid: false,
                    error: `金额必须在 ${min_price} - ${max_price} 范围内`
                };
            }
            return {
                amount,
                valid: true,
                ...calculateHighReturn(amount, daily_profit, duration_hours)
            };
        }
        
        // Grid 机器人
        return {
            amount,
            valid: true,
            ...calculateGridReturn(amount, daily_profit, duration_hours)
        };
    });
}

/**
 * 计算最优投资组合
 * 在预算范围内，计算购买哪些机器人能获得最大收益
 * 
 * @param {object[]} robots - 机器人列表
 * @param {number} budget - 预算金额
 * @returns {object} 最优组合建议
 */
export function calculateOptimalPortfolio(robots, budget) {
    // 计算每个机器人的日化收益率
    const robotsWithROI = robots.map(robot => {
        const calc = robot.robot_type === 'high' 
            ? calculateHighReturn(robot.price || robot.min_price, robot.daily_profit, robot.duration_hours)
            : calculateGridReturn(robot.price, robot.daily_profit, robot.duration_hours);
        
        // 日化收益率 = 总收益 / 本金 / 天数 × 100
        const dailyROI = calc.totalProfit / (robot.price || robot.min_price) / calc.durationDays * 100;
        
        return {
            ...robot,
            calc,
            dailyROI: round(dailyROI, 4),
            efficiency: round(dailyROI / robot.daily_profit, 4) // 收益效率
        };
    });
    
    // 按日化收益率排序
    robotsWithROI.sort((a, b) => b.dailyROI - a.dailyROI);
    
    // 贪心算法选择机器人
    const selected = [];
    let remainingBudget = budget;
    let totalExpectedReturn = 0;
    
    for (const robot of robotsWithROI) {
        const cost = robot.price || robot.min_price;
        if (cost <= remainingBudget) {
            selected.push({
                name: robot.name,
                cost,
                expectedReturn: robot.calc.totalReturn,
                dailyROI: robot.dailyROI
            });
            remainingBudget -= cost;
            totalExpectedReturn += robot.calc.totalReturn;
        }
    }
    
    return {
        budget,
        totalInvested: budget - remainingBudget,
        remainingBudget,
        totalExpectedReturn: round(totalExpectedReturn, 2),
        totalProfit: round(totalExpectedReturn - (budget - remainingBudget), 2),
        selectedRobots: selected,
        suggestion: selected.length > 0 
            ? `建议购买 ${selected.length} 个机器人，预期总收益 ${round(totalExpectedReturn - (budget - remainingBudget), 2)} USDT`
            : '预算不足，无法购买任何机器人'
    };
}

// ============================================================================
// 格式化函数
// ============================================================================

/**
 * 格式化运行周期显示
 * 
 * @param {number} hours - 小时数
 * @returns {string} 格式化后的显示文本
 */
export function formatDuration(hours) {
    if (!hours) return '-';
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (hours < 24) {
        return `${hours}小时`;
    }
    
    if (remainingHours === 0) {
        return `${days}天`;
    }
    
    return `${days}天${remainingHours}小时`;
}

/**
 * 格式化金额显示
 * 
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的金额
 */
export function formatAmount(amount, decimals = 2) {
    if (amount === null || amount === undefined) return '-';
    
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * 格式化收益率显示
 * 
 * @param {number} rate - 收益率（百分比）
 * @returns {string} 格式化后的收益率
 */
export function formatRate(rate) {
    if (rate === null || rate === undefined) return '-';
    return `${Number(rate).toFixed(2)}%`;
}

/**
 * 格式化价格范围显示（High机器人用）
 * 
 * @param {number} minPrice - 最低价格
 * @param {number} maxPrice - 最高价格
 * @returns {string} 格式化后的价格范围
 */
export function formatPriceRange(minPrice, maxPrice) {
    return `${formatAmount(minPrice, 0)}-${formatAmount(maxPrice, 0)}`;
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证 High 机器人投入金额
 * 
 * @param {number} amount - 投入金额
 * @param {number} minPrice - 最低价格
 * @param {number} maxPrice - 最高价格
 * @returns {object} 验证结果
 */
export function validateHighAmount(amount, minPrice, maxPrice) {
    if (isNaN(amount) || amount <= 0) {
        return { valid: false, error: '请输入有效金额' };
    }
    
    if (amount < minPrice) {
        return { valid: false, error: `最低投入金额为 ${minPrice} USDT` };
    }
    
    if (amount > maxPrice) {
        return { valid: false, error: `最高投入金额为 ${maxPrice} USDT` };
    }
    
    return { valid: true };
}

/**
 * 验证余额是否足够
 * 
 * @param {number} balance - 当前余额
 * @param {number} price - 需要支付的金额
 * @returns {object} 验证结果
 */
export function validateBalance(balance, price) {
    if (balance < price) {
        return { 
            valid: false, 
            error: `余额不足，当前余额 ${formatAmount(balance, 4)} USDT，需要 ${formatAmount(price, 4)} USDT`,
            shortage: price - balance
        };
    }
    return { valid: true };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 四舍五入到指定小数位
 * 
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {number} 四舍五入后的数字
 */
function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * 计算剩余时间
 * 
 * @param {Date|string} endTime - 结束时间
 * @returns {object} 剩余时间信息
 */
export function calculateRemainingTime(endTime) {
    const end = new Date(endTime);
    const now = new Date();
    const remaining = end - now;
    
    if (remaining <= 0) {
        return { expired: true, text: '已到期' };
    }
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) {
        text = `${days}天${hours}小时`;
    } else if (hours > 0) {
        text = `${hours}小时${minutes}分钟`;
    } else {
        text = `${minutes}分钟`;
    }
    
    return {
        expired: false,
        days,
        hours,
        minutes,
        totalHours: remaining / (1000 * 60 * 60),
        text
    };
}

/**
 * 计算下次可量化时间
 * 
 * @param {Date|string} lastQuantifyTime - 上次量化时间
 * @param {number} intervalHours - 量化间隔（小时）
 * @returns {object} 下次量化时间信息
 */
export function calculateNextQuantifyTime(lastQuantifyTime, intervalHours = 24) {
    if (!lastQuantifyTime) {
        return { canQuantify: true, text: '可以量化' };
    }
    
    const last = new Date(lastQuantifyTime);
    const next = new Date(last.getTime() + intervalHours * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= next) {
        return { canQuantify: true, text: '可以量化' };
    }
    
    const remaining = next - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        canQuantify: false,
        nextTime: next,
        hoursRemaining: remaining / (1000 * 60 * 60),
        text: `${hours}小时${minutes}分钟后可量化`
    };
}

// ============================================================================
// 数据转换函数
// ============================================================================

/**
 * 将后端机器人配置转换为前端显示格式
 * 
 * @param {object} config - 后端机器人配置
 * @returns {object} 前端显示格式
 */
export function transformRobotConfig(config) {
    const isHigh = config.robot_type === 'high';
    
    // 计算收益
    const calc = isHigh
        ? calculateHighReturn(config.min_price, config.daily_profit, config.duration_hours)
        : calculateGridReturn(config.price, config.daily_profit, config.duration_hours);
    
    return {
        ...config,
        // 显示用字段
        displayPrice: isHigh 
            ? formatPriceRange(config.min_price, config.max_price)
            : formatAmount(config.price, 0),
        displayDuration: formatDuration(config.duration_hours),
        displayDailyProfit: formatRate(config.daily_profit),
        displayTotalReturn: isHigh
            ? formatRate(calc.totalReturnRate)
            : formatAmount(calc.totalProfit, 0) + ' USDT',
        // 计算结果
        calc,
        // 类型标识
        isHigh,
        isGrid: config.robot_type === 'grid'
    };
}

/**
 * 批量转换机器人配置
 * 
 * @param {object[]} configs - 后端机器人配置列表
 * @returns {object[]} 前端显示格式列表
 */
export function transformRobotConfigs(configs) {
    return configs.map(transformRobotConfig);
}

// ============================================================================
// 导出汇总
// ============================================================================

export default {
    // 常量
    DEFAULT_GRID_CONFIG,
    DEFAULT_HIGH_CONFIG,
    
    // 核心计算
    calculateGridReturn,
    calculateHighReturn,
    calculateQuantifyEarnings,
    simulateReturns,
    calculateOptimalPortfolio,
    
    // 格式化
    formatDuration,
    formatAmount,
    formatRate,
    formatPriceRange,
    
    // 验证
    validateHighAmount,
    validateBalance,
    
    // 工具
    calculateRemainingTime,
    calculateNextQuantifyTime,
    
    // 数据转换
    transformRobotConfig,
    transformRobotConfigs
};

