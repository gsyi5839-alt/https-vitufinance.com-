/**
 * 安全工具模块
 * 
 * 功能：
 * - 密码哈希与验证
 * - 钱包地址验证
 * - 输入清理与验证
 * - 安全相关辅助函数
 */

import bcrypt from 'bcryptjs';
import validator from 'validator';

// ==================== 密码安全 ====================

/**
 * 密码哈希
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 哈希后的密码
 */
export async function hashPassword(password) {
    const saltRounds = 12; // 使用12轮盐值，提高安全性
    return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - 哈希后的密码
 * @returns {Promise<boolean>} - 是否匹配
 */
export async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// ==================== 钱包地址验证 ====================

/**
 * 验证以太坊/BSC钱包地址格式
 * @param {string} address - 钱包地址
 * @returns {boolean} - 是否有效
 */
export function isValidWalletAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    
    // 以太坊/BSC地址格式：0x开头，后跟40位十六进制字符
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethereumAddressRegex.test(address);
}

/**
 * 标准化钱包地址（转小写）
 * @param {string} address - 钱包地址
 * @returns {string|null} - 标准化后的地址，无效则返回null
 */
export function normalizeWalletAddress(address) {
    if (!isValidWalletAddress(address)) {
        return null;
    }
    return address.toLowerCase();
}

// ==================== 输入验证 ====================

/**
 * 验证交易哈希格式
 * @param {string} txHash - 交易哈希
 * @returns {boolean} - 是否有效
 */
export function isValidTxHash(txHash) {
    if (!txHash || typeof txHash !== 'string') {
        return false;
    }
    // 交易哈希格式：0x开头，后跟64位十六进制字符
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    return txHashRegex.test(txHash);
}

/**
 * 验证金额格式
 * @param {number|string} amount - 金额
 * @param {number} min - 最小值（默认0）
 * @param {number} max - 最大值（默认无限）
 * @returns {boolean} - 是否有效
 */
export function isValidAmount(amount, min = 0, max = Infinity) {
    const num = parseFloat(amount);
    return !isNaN(num) && isFinite(num) && num >= min && num <= max;
}

/**
 * 清理字符串输入（防止XSS）
 * @param {string} input - 输入字符串
 * @returns {string} - 清理后的字符串
 */
export function sanitizeString(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    // 使用validator库转义HTML特殊字符
    return validator.escape(input.trim());
}

/**
 * 验证整数
 * @param {number|string} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} - 是否有效
 */
export function isValidInteger(value, min = 0, max = Infinity) {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= min && num <= max && Number.isInteger(num);
}

/**
 * 验证分页参数
 * @param {number|string} page - 页码
 * @param {number|string} pageSize - 每页数量
 * @returns {{page: number, pageSize: number}} - 安全的分页参数
 */
export function sanitizePagination(page, pageSize) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    return { page: safePage, pageSize: safePageSize };
}

// ==================== SQL注入防护 ====================

/**
 * 验证SQL表名/列名（防止SQL注入）
 * 只允许字母、数字和下划线
 * @param {string} identifier - 标识符
 * @returns {boolean} - 是否有效
 */
export function isValidSqlIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
        return false;
    }
    const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return identifierRegex.test(identifier);
}

// ==================== 安全日志 ====================

/**
 * 安全日志（隐藏敏感信息）
 * @param {string} message - 日志消息
 * @param {object} data - 日志数据
 */
export function secureLog(message, data = {}) {
    // 隐藏敏感字段
    const sanitizedData = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
        if (sanitizedData[field]) {
            sanitizedData[field] = '***HIDDEN***';
        }
    }
    
    // 隐藏钱包地址中间部分
    if (sanitizedData.wallet_address) {
        const addr = sanitizedData.wallet_address;
        sanitizedData.wallet_address = addr.slice(0, 6) + '...' + addr.slice(-4);
    }
    
    console.log(`[Security] ${message}`, sanitizedData);
}

// ==================== 请求验证中间件辅助 ====================

/**
 * 生成错误响应
 * @param {string} message - 错误消息
 * @param {string} field - 错误字段
 * @returns {object} - 错误对象
 */
export function validationError(message, field = null) {
    return {
        success: false,
        message: message,
        field: field
    };
}

// ==================== 全局输入清理中间件 ====================

/**
 * 全局输入清理中间件
 * Sanitizes all string inputs in request body, query, and params
 */
export function globalInputSanitizer(req, res, next) {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    
    next();
}

/**
 * Recursively sanitize object values
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (typeof item === 'string') {
                return sanitizeString(item);
            } else if (typeof item === 'object' && item !== null) {
                return sanitizeObject(item);
            }
            return item;
        });
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

export default {
    hashPassword,
    verifyPassword,
    isValidWalletAddress,
    normalizeWalletAddress,
    isValidTxHash,
    isValidAmount,
    sanitizeString,
    isValidInteger,
    sanitizePagination,
    isValidSqlIdentifier,
    secureLog,
    validationError,
    globalInputSanitizer
};

