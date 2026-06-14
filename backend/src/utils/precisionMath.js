/**
 * Precision Math Module - 精确数学运算模块
 *
 * Uses Decimal.js for precise financial calculations
 * Solves JavaScript floating-point precision issues
 *
 * Example: 0.1 + 0.2 = 0.30000000000000004 (JS)
 *          0.1 + 0.2 = 0.3 (Decimal.js)
 */

import { Decimal } from './precisionDecimal.js';
import {
    REWARD_RATES,
    calculateLevelReward,
    calculateAllLevelRewards
} from './precisionReferralRewards.js';
import {
    BROKER_LEVELS,
    calculateBrokerLevel,
    calculateDailyBonus,
    calculateMonthlyBonus,
    getDailyWldLimit
} from './precisionBrokerRewards.js';

// ============================================================================
// Decimal Configuration - 设置精度
// ============================================================================

export {
    REWARD_RATES,
    calculateLevelReward,
    calculateAllLevelRewards,
    BROKER_LEVELS,
    calculateBrokerLevel,
    calculateDailyBonus,
    calculateMonthlyBonus,
    getDailyWldLimit
};

// ============================================================================
// Core Arithmetic Functions - 核心运算函数
// ============================================================================

/**
 * Precise addition - 精确加法
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {string} Result as string with 4 decimal places
 */
export function add(a, b) {
    const result = new Decimal(a || 0).plus(new Decimal(b || 0));
    return result.toFixed(4);
}

/**
 * Precise subtraction - 精确减法
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {string} Result as string with 4 decimal places
 */
export function subtract(a, b) {
    const result = new Decimal(a || 0).minus(new Decimal(b || 0));
    return result.toFixed(4);
}

/**
 * Precise multiplication - 精确乘法
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {string} Result as string with 4 decimal places
 */
export function multiply(a, b) {
    const result = new Decimal(a || 0).times(new Decimal(b || 0));
    return result.toFixed(4);
}

/**
 * Precise division - 精确除法
 * @param {number|string} a - Dividend
 * @param {number|string} b - Divisor
 * @returns {string} Result as string with 4 decimal places
 */
export function divide(a, b) {
    if (new Decimal(b || 0).isZero()) {
        return '0.0000';
    }
    const result = new Decimal(a || 0).dividedBy(new Decimal(b));
    return result.toFixed(4);
}

/**
 * Precise percentage calculation - 精确百分比计算
 * @param {number|string} amount - Base amount
 * @param {number|string} rate - Rate (0-100 for percentage, 0-1 for decimal)
 * @param {boolean} isDecimal - If true, rate is decimal (0.3 = 30%), default false
 * @returns {string} Result as string with 4 decimal places
 */
export function percentage(amount, rate, isDecimal = false) {
    const amountDec = new Decimal(amount || 0);
    const rateDec = new Decimal(rate || 0);
    
    const result = isDecimal 
        ? amountDec.times(rateDec)
        : amountDec.times(rateDec.dividedBy(100));
    
    return result.toFixed(4);
}

/**
 * Compare two numbers - 比较两个数字
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {number} -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compare(a, b) {
    return new Decimal(a || 0).comparedTo(new Decimal(b || 0));
}

/**
 * Check if number is greater than - 大于判断
 */
export function isGreaterThan(a, b) {
    return compare(a, b) === 1;
}

/**
 * Check if number is less than - 小于判断
 */
export function isLessThan(a, b) {
    return compare(a, b) === -1;
}

/**
 * Check if number is greater than or equal - 大于等于判断
 */
export function isGreaterOrEqual(a, b) {
    return compare(a, b) >= 0;
}

/**
 * Check if number is less than or equal - 小于等于判断
 */
export function isLessOrEqual(a, b) {
    return compare(a, b) <= 0;
}

/**
 * Get minimum value - 取最小值
 */
export function min(a, b) {
    return Decimal.min(new Decimal(a || 0), new Decimal(b || 0)).toFixed(4);
}

/**
 * Get maximum value - 取最大值
 */
export function max(a, b) {
    return Decimal.max(new Decimal(a || 0), new Decimal(b || 0)).toFixed(4);
}

// ============================================================================
// Financial Calculation Functions - 金融计算函数
// ============================================================================

/**
 * Calculate equity value - 计算权益价值
 * Formula: Equity = USDT + (WLD × WLD_Price)
 * 
 * @param {number|string} usdtBalance - USDT balance
 * @param {number|string} wldBalance - WLD balance
 * @param {number|string} wldPrice - WLD price in USDT
 * @returns {string} Total equity value
 */
export function calculateEquity(usdtBalance, wldBalance, wldPrice) {
    const usdt = new Decimal(usdtBalance || 0);
    const wld = new Decimal(wldBalance || 0);
    const price = new Decimal(wldPrice || 0);
    
    const wldValue = wld.times(price);
    const equity = usdt.plus(wldValue);
    
    return equity.toFixed(4);
}

/**
 * Calculate robot quantify earnings - 计算机器人量化收益
 * Formula: Earnings = Price × DailyProfit × (IntervalHours / 24)
 * 
 * @param {number|string} price - Robot price (investment)
 * @param {number|string} dailyProfitRate - Daily profit rate (percentage)
 * @param {number} intervalHours - Quantify interval in hours (default 24)
 * @returns {string} Earnings amount
 */
export function calculateQuantifyEarnings(price, dailyProfitRate, intervalHours = 24) {
    const priceDec = new Decimal(price || 0);
    const rate = new Decimal(dailyProfitRate || 0).dividedBy(100);
    const intervalDays = new Decimal(intervalHours).dividedBy(24);
    
    const earnings = priceDec.times(rate).times(intervalDays);
    return earnings.toFixed(4);
}

/**
 * Calculate total return - 计算总回报
 * Formula: TotalReturn = Principal + (Principal × DailyRate × Days)
 * 
 * @param {number|string} principal - Principal amount
 * @param {number|string} dailyRate - Daily profit rate (percentage)
 * @param {number} days - Duration in days
 * @returns {string} Total return amount
 */
export function calculateTotalReturn(principal, dailyRate, days) {
    const p = new Decimal(principal || 0);
    const r = new Decimal(dailyRate || 0).dividedBy(100);
    const d = new Decimal(days || 0);
    
    const interest = p.times(r).times(d);
    const total = p.plus(interest);
    
    return total.toFixed(4);
}

// ============================================================================
// Utility Functions - 工具函数
// ============================================================================

/**
 * Format amount to fixed decimal places - 格式化金额
 * 
 * @param {number|string} amount - Amount to format
 * @param {number} decimals - Decimal places (default 4)
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, decimals = 4) {
    return new Decimal(amount || 0).toFixed(decimals);
}

/**
 * Parse string to number safely - 安全解析数字
 * 
 * @param {string} str - String to parse
 * @param {number} defaultValue - Default value if parse fails
 * @returns {number} Parsed number
 */
export function parseNumber(str, defaultValue = 0) {
    try {
        const dec = new Decimal(str);
        return dec.toNumber();
    } catch {
        return defaultValue;
    }
}

/**
 * Check if amount is valid (positive number) - 检查金额是否有效
 * 
 * @param {number|string} amount - Amount to check
 * @returns {boolean} True if valid positive number
 */
export function isValidAmount(amount) {
    try {
        const dec = new Decimal(amount);
        return dec.isPositive() && !dec.isZero();
    } catch {
        return false;
    }
}

/**
 * Sum array of amounts - 求和数组金额
 * 
 * @param {Array} amounts - Array of amounts
 * @returns {string} Sum as string
 */
export function sumAmounts(amounts) {
    let total = new Decimal(0);
    for (const amount of amounts) {
        total = total.plus(new Decimal(amount || 0));
    }
    return total.toFixed(4);
}

// ============================================================================
// Export All Functions
// ============================================================================

export default {
    // Core arithmetic
    add,
    subtract,
    multiply,
    divide,
    percentage,
    compare,
    isGreaterThan,
    isLessThan,
    isGreaterOrEqual,
    isLessOrEqual,
    min,
    max,
    
    // Financial calculations
    calculateEquity,
    calculateQuantifyEarnings,
    calculateTotalReturn,
    
    // Referral rewards
    REWARD_RATES,
    calculateLevelReward,
    calculateAllLevelRewards,
    
    // Broker levels
    BROKER_LEVELS,
    calculateBrokerLevel,
    calculateDailyBonus,
    calculateMonthlyBonus,
    getDailyWldLimit,
    
    // Utilities
    formatAmount,
    parseNumber,
    isValidAmount,
    sumAmounts
};
