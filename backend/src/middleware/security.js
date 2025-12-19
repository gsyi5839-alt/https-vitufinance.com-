/**
 * 安全中间件模块
 * 
 * 功能：
 * - HTTP安全头设置（helmet）
 * - API速率限制
 * - 请求日志记录
 * - IP黑名单检查
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// ==================== Helmet 安全头配置 ====================

/**
 * Helmet 中间件配置
 * 设置各种HTTP安全头
 */
export const helmetMiddleware = helmet({
    // 内容安全策略 - 禁用以避免与前端冲突
    contentSecurityPolicy: false,
    // 跨域嵌入策略
    crossOriginEmbedderPolicy: false,
    // 跨域打开策略
    crossOriginOpenerPolicy: false,
    // 跨域资源策略
    crossOriginResourcePolicy: false,
    // DNS预取控制
    dnsPrefetchControl: { allow: false },
    // 下载选项
    frameguard: { action: 'deny' },
    // 隐藏 X-Powered-By
    hidePoweredBy: true,
    // HSTS
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    // IE无嗅探
    ieNoOpen: true,
    // 不缓存
    noSniff: true,
    // 引荐策略
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // XSS过滤
    xssFilter: true
});

// ==================== 速率限制配置 ====================

/**
 * 通用API速率限制
 * 每个IP每分钟最多300次请求（适合生产环境）
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟窗口
    max: 300, // 每分钟最多300次请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试',
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 禁用验证以避免trust proxy和xForwardedForHeader警告
    validate: { trustProxy: false, xForwardedForHeader: false }
});

/**
 * 登录API速率限制（更严格）
 * 每个IP每15分钟最多10次登录尝试
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 每窗口最多10次
    message: {
        success: false,
        message: '登录尝试过多，请15分钟后再试',
        error: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    validate: { trustProxy: false, xForwardedForHeader: false }
});

/**
 * 敏感操作速率限制（提款、充值）
 * 每个IP每小时最多50次
 */
export const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 50, // 每窗口最多50次
    message: {
        success: false,
        message: '操作过于频繁，请稍后再试',
        error: 'Too many sensitive operations, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false }
});

/**
 * 量化操作速率限制
 * 每个IP每分钟最多30次
 */
export const quantifyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 30, // 每窗口最多30次
    message: {
        success: false,
        message: '量化操作过于频繁，请稍后再试',
        error: 'Too many quantify operations, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false }
});

// ==================== 请求日志中间件 ====================

/**
 * 安全请求日志中间件
 * 记录所有API请求（隐藏敏感信息）
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求信息
    const logData = {
        method: req.method,
        path: req.path,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent']?.substring(0, 100)
    };
    
    // 完成时记录响应信息
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // 只记录重要请求（POST/PUT/DELETE 或 错误响应 >= 400）
        if (req.method !== 'GET' || statusCode >= 400) {
            console.log(`[Request] ${logData.method} ${logData.path} - ${statusCode} - ${duration}ms - IP: ${logData.ip}`);
        }
    });
    
    next();
};

// ==================== IP黑名单中间件 ====================

// 内存中的IP黑名单
const ipBlacklist = new Set();

/**
 * 添加IP到黑名单
 * @param {string} ip - IP地址
 * @param {number} duration - 封禁时长（毫秒），默认1小时
 */
export function blockIP(ip, duration = 60 * 60 * 1000) {
    ipBlacklist.add(ip);
    console.log(`[Security] IP已封禁: ${ip}`);
    
    // 定时解除封禁
    setTimeout(() => {
        ipBlacklist.delete(ip);
        console.log(`[Security] IP已解封: ${ip}`);
    }, duration);
}

/**
 * IP黑名单检查中间件
 */
export const ipBlacklistMiddleware = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    
    if (ip && ipBlacklist.has(ip)) {
        console.log(`[Security] 被封禁的IP尝试访问: ${ip}`);
        return res.status(403).json({
            success: false,
            message: '您的IP已被临时封禁',
            error: 'Your IP has been temporarily blocked'
        });
    }
    
    next();
};

// ==================== 可疑行为检测 ====================

// 记录可疑行为计数
const suspiciousActivity = new Map();

/**
 * 记录可疑行为
 * @param {string} ip - IP地址
 * @param {string} reason - 原因
 */
export function recordSuspiciousActivity(ip, reason) {
    if (!ip) return;
    
    const count = (suspiciousActivity.get(ip) || 0) + 1;
    suspiciousActivity.set(ip, count);
    
    console.log(`[Security] 可疑行为: ${ip} - ${reason} (第${count}次)`);
    
    // 如果可疑行为超过阈值，自动封禁
    if (count >= 20) {
        blockIP(ip, 60 * 60 * 1000); // 封禁1小时
        suspiciousActivity.delete(ip);
    }
    
    // 1小时后清除记录
    setTimeout(() => {
        const currentCount = suspiciousActivity.get(ip);
        if (currentCount) {
            suspiciousActivity.set(ip, Math.max(0, currentCount - 1));
        }
    }, 60 * 60 * 1000);
}

export default {
    helmetMiddleware,
    generalLimiter,
    loginLimiter,
    sensitiveLimiter,
    quantifyLimiter,
    requestLogger,
    ipBlacklistMiddleware,
    blockIP,
    recordSuspiciousActivity
};
