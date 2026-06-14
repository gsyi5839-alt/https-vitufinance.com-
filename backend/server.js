import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { healthCheck as dbHealthCheck, query as dbQuery } from './db.js';
import adminRoutes from './src/adminRoutes.js';
import marketRoutes from './src/routes/marketRoutes.js';
import { createPlatformRoutes } from './src/routes/platformRoutes.js';
import { createUserRoutes } from './src/routes/userRoutes.js';
import { createHistoryRoutes } from './src/routes/historyRoutes.js';
import { createMonitoringRoutes, initUserBehaviorTable } from './src/routes/monitoringRoutes.js';
import { createAnnouncementRoutes, initAnnouncementTable } from './src/routes/announcementRoutes.js';
import { createSystemRoutes } from './src/routes/systemRoutes.js';
import { createAdminCompatRoutes } from './src/routes/adminCompatRoutes.js';
import { createCheckinRoutes, initCheckinTable } from './src/routes/checkinRoutes.js';
import { createPledgeRoutes, initPledgeTables } from './src/routes/pledgeRoutes.js';
import { createErrorLogRoutes } from './src/routes/errorLogRoutes.js';
import { createSafeRoutes, initSafeTable } from './src/routes/safeRoutes.js';
import { createExchangeRoutes } from './src/routes/exchangeRoutes.js';
import { createUserTransactionRoutes } from './src/routes/userTransactionRoutes.js';
import { createRobotStatsRoutes } from './src/routes/robotStatsRoutes.js';
import { createInviteRegisterRoutes } from './src/routes/inviteRegisterRoutes.js';
import { createInviteStatsRoutes } from './src/routes/inviteStatsRoutes.js';
import { createInviteReferralRoutes } from './src/routes/inviteReferralRoutes.js';
import { createReferralRoutes } from './src/routes/referralRoutes.js';
import { createReferralRewardRoutes, fixReferralRewardsTable } from './src/routes/referralRewardRoutes.js';
import { createUserLevelRoutes } from './src/routes/userLevelRoutes.js';
import { createDeprecatedRobotPurchaseRoutes } from './src/routes/deprecatedRobotPurchaseRoutes.js';
import { createDeprecatedRobotListRoutes } from './src/routes/deprecatedRobotListRoutes.js';
import { createDeprecatedRobotQuantifyRoutes } from './src/routes/deprecatedRobotQuantifyRoutes.js';
import { createBrokerLevelService } from './src/services/brokerLevelService.js';
import { createDeprecatedRobotExpiryService } from './src/services/deprecatedRobotExpiryService.js';

// ==================== 新的机器人路由模块（小时精度修复） ====================
import {
    router as robotRoutes,
    setDbQuery as setRobotDbQuery
} from './src/routes/robotRoutes.js';
import {
    setDbQuery as setCronDbQuery,
    startCronJob
} from './src/cron/robotExpiryCron.js';

// 钱包签名认证路由（TokenPocket 等）
import authRoutes from './src/routes/authRoutes.js';

// 导入团队经纪人每日分红定时任务
import {
    setDbQuery as setTeamCronDbQuery,
    initTeamRewardsTable,
    initCronLogsTable,
    startTeamDividendCron,
    manualProcessDividends,
    processWalletDailyDividend,      // 立即发放单用户分红（达到要求即发放）
    processUplineDailyDividends      // 触发上级链路的分红检查
} from './src/cron/teamDividendCron.js';

// 导入充值监控定时任务 (BSC)
import { startDepositMonitor } from './src/cron/depositMonitorCron.js';

// 导入 ETH 链充值监控定时任务
import { startEthDepositMonitor } from './src/cron/ethDepositMonitorCron.js';

// 导入抽奖转盘路由
import luckyWheelRoutes, {
    setDbQuery as setLuckyWheelDbQuery,
    initLuckyWheelTables,
    addLuckyPoints
} from './src/routes/luckyWheelRoutes.js';

// 导入模拟金额自动增长定时任务
import { startSimulatedGrowthCron, getPageTotalAmount } from './src/cron/simulatedGrowthCron.js';

// 导入经纪人等级定时任务
import {
    startBrokerLevelCron,
    setDbQuery as setBrokerDbQuery
} from './src/cron/brokerLevelCron.js';

// 导入错误日志模块
import {
    initErrorLogsTable,
    logError,
    errorLoggerMiddleware,
    setupGlobalErrorHandlers,
    ErrorLevel,
    ErrorSource
} from './src/utils/errorLogger.js';

// 安全模块导入
import {
    globalInputSanitizer
} from './src/security/index.js';
import { createWldExchangeTools } from './src/utils/wldExchange.js';
import {
    helmetMiddleware,
    generalLimiter,
    sensitiveLimiter,
    quantifyLimiter,
    requestLogger,
    ipBlacklistMiddleware
} from './src/middleware/security.js';

// CSRF防护模块导入
import {
    sessionMiddleware,
    csrfTokenMiddleware,
    csrfErrorHandler,
    apiCsrfProtection,
    setupCsrfRoutes
} from './src/middleware/csrf.js';

// 钱包签名认证中间件（C2：校验 JWT 并强制 wallet_address 归属，防止未授权 IDOR）
import { createWalletAuthMiddleware } from './src/middleware/walletAuth.js';
const walletAuth = createWalletAuthMiddleware();

// 高级安全中间件导入 - 综合防护系统
import {
    initSecurityModules,
    comprehensiveSecurityMiddleware,
    additionalSecurityHeadersMiddleware,
    pathTraversalProtectionMiddleware
} from './src/security/securityMiddleware.js';

// SQL注入防护模块导入
import {
    sqlInjectionMiddleware
} from './src/security/sqlInjectionProtection.js';

// Enhanced security protection module - 2024-12-21
import {
    initEnhancedProtection
} from './src/security/enhancedProtection.js';

// 导入 BSC 转账服务
import {
    initializeBSCProvider
} from './src/utils/bscTransferService.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 信任代理配置 (因为在Nginx反向代理后面)
// 设为1表示只信任最近的一个代理（Nginx）
// 这样Express限流器可以正确识别真实用户IP
app.set('trust proxy', 1);

// 初始化全局错误处理器
setupGlobalErrorHandlers();

// ==================== 安全中间件配置 ====================

// Helmet 安全头
app.use(helmetMiddleware);

// 额外安全头（补充Helmet）
app.use(additionalSecurityHeadersMiddleware);

// 目录遍历防护
app.use(pathTraversalProtectionMiddleware);

// 综合安全中间件（IP防护、SQL注入检测、XSS防护、Bot检测）
app.use(comprehensiveSecurityMiddleware);

// IP黑名单检查
app.use(ipBlacklistMiddleware);

// 请求日志
app.use(requestLogger);

// 解析请求体
app.use(bodyParser.json({ limit: '10kb' })); // 限制请求体大小，防止DOS攻击
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Session中间件（用于CSRF防护）
app.use(sessionMiddleware);

// 全局输入清理中间件（必须在bodyParser之后）
app.use(globalInputSanitizer);

// SQL注入防护中间件（检测所有请求参数中的SQL注入模式）
app.use(sqlInjectionMiddleware);

// CSRF令牌中间件
app.use(csrfTokenMiddleware);

// API CSRF防护（对POST/PUT/DELETE请求验证CSRF令牌）
app.use('/api/user', apiCsrfProtection);

// 钱包签名认证 / 归属校验（C2）。软模式下仅对已携带 token 的请求强制归属匹配；
// 设置 ENFORCE_WALLET_AUTH=true 后，所有以下路由都必须携带有效 token。
app.use('/api/user', walletAuth);
app.use('/api/exchange', walletAuth);
app.use('/api/pledge', walletAuth);
app.use('/api/referral', walletAuth);
// 注意：/api/robot 路径的 CSRF 保护由 robotRoutes 内部处理（支持移动端钱包白名单）
// app.use('/api/robot', apiCsrfProtection); // 已注释，避免与内部白名单冲突
// 管理系统使用 JWT Token 认证，不需要 CSRF 保护
// app.use('/api/admin', apiCsrfProtection); // 已禁用 - 使用纯 JWT 认证

// CSRF错误处理中间件（必须在路由之前）
app.use(csrfErrorHandler);

// 静态文件服务 - 用于头像等上传文件的访问
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS配置 - 生产环境与开发环境分离
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://vitufinance.com',
        'https://www.vitufinance.com'
      ]
    : [
        'https://vitufinance.com',
        'https://www.vitufinance.com',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ];

app.use(cors({
    origin: function (origin, callback) {
        // 允许无origin的请求（如移动端应用）
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`[CORS] 拒绝来源: ${origin}`);
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    maxAge: 86400 // 预检请求缓存24小时
}));

// 应用通用速率限制
app.use('/api/', generalLimiter);

app.use(createSystemRoutes({ dbHealthCheck, dbQuery }));

// ==================== CSRF防护路由设置 ====================
setupCsrfRoutes(app);

app.use('/api/market', marketRoutes);
app.use('/api', createMonitoringRoutes({ dbQuery }));

initAnnouncementTable(dbQuery);
initUserBehaviorTable(dbQuery);
initCheckinTable(dbQuery);
initPledgeTables(dbQuery);
initSafeTable(dbQuery);
app.use('/api/announcements', createAnnouncementRoutes({ dbQuery }));

// ==================== 用户钱包余额管理 API ====================

/**
 * 平台收款地址配置
 * 优先从数据库读取，支持后台动态修改
 */
let PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4';

const {
    ensureWldExchangeSchema,
    fetchWldPriceFromBinance
} = createWldExchangeTools(dbQuery);
const brokerLevelService = createBrokerLevelService({ dbQuery });
const {
    calculateUserLevel,
    collectTeamWallets,
    getLevelName,
    getQualifiedDirectCounts,
    getSubBrokerStats,
    getTeamPerformance
} = brokerLevelService;

app.use('/api/user', createUserRoutes({ dbQuery }));

app.use('/api/platform', createPlatformRoutes({
    dbQuery,
    defaultWalletAddress: PLATFORM_WALLET_ADDRESS,
    getPageTotalAmount
}));
app.use('/api/admin', createAdminCompatRoutes({ dbQuery, manualProcessDividends }));
app.use('/api/checkin', createCheckinRoutes({ dbQuery }));
app.use('/api/pledge', createPledgeRoutes({ dbQuery }));
app.use('/api', createErrorLogRoutes({ logError, ErrorLevel, ErrorSource }));
app.use('/api/safe', createSafeRoutes({ dbQuery }));
app.use('/api/invite', createInviteRegisterRoutes({
    dbQuery,
    addLuckyPoints,
    processUplineDailyDividends
}));
app.use('/api/invite', createInviteStatsRoutes({
    dbQuery,
    calculateUserLevel,
    getQualifiedDirectCounts,
    getSubBrokerStats,
    processWalletDailyDividend
}));
app.use('/api/invite', createInviteReferralRoutes({ dbQuery }));
fixReferralRewardsTable(dbQuery);
app.use('/api', createReferralRewardRoutes({ dbQuery }));
app.use('/api/referral', createReferralRoutes({ dbQuery }));
app.use('/api/user', createUserTransactionRoutes({
    dbQuery,
    processUplineDailyDividends
}));
app.use('/api/user', createUserLevelRoutes({
    dbQuery,
    calculateUserLevel,
    collectTeamWallets,
    getLevelName,
    getQualifiedDirectCounts,
    getSubBrokerStats,
    getTeamPerformance
}));
app.use('/api/exchange', createExchangeRoutes({
    dbQuery,
    sensitiveLimiter,
    calculateUserLevel,
    ensureWldExchangeSchema,
    fetchWldPriceFromBinance
}));
app.use('/api/robot', createRobotStatsRoutes({ dbQuery }));

// ==================== 安全模块初始化 ====================
// 初始化综合安全防护系统（IP防护、SQL注入防护、攻击日志、文件保护）
(async () => {
    try {
        const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
        await initSecurityModules(dbQuery, projectRoot);
        console.log('[Security] 综合安全防护系统已初始化');

        // Initialize enhanced protection module - 2024-12-21
        await initEnhancedProtection(dbQuery);
        console.log('[Security] 增强安全防护已初始化');
    } catch (error) {
        console.error('[Security] 安全模块初始化失败:', error.message);
    }
})();

// ==================== 新的机器人路由（小时精度修复版） ====================
// 设置数据库查询函数
setRobotDbQuery(dbQuery);
setCronDbQuery(dbQuery);

// 设置团队分红模块数据库查询函数
setTeamCronDbQuery(dbQuery);
// 初始化团队奖励表和执行日志表
initTeamRewardsTable();
initCronLogsTable();

// 设置抽奖模块数据库查询函数
setLuckyWheelDbQuery(dbQuery);
// 初始化抽奖相关表
initLuckyWheelTables();

// 注册新的机器人路由（优先于下面的旧路由）
app.use(robotRoutes);
console.log('[Routes] 新的机器人路由已注册（小时精度版本）');

// 注册钱包签名认证路由
app.use(authRoutes);
console.log('[Routes] 钱包签名认证路由已注册');

const deprecatedRobotExpiryService = createDeprecatedRobotExpiryService({ dbQuery });
app.use('/api', createDeprecatedRobotPurchaseRoutes({ dbQuery }));
app.use('/api', createDeprecatedRobotListRoutes({
    dbQuery,
    ...deprecatedRobotExpiryService
}));
app.use('/api', createDeprecatedRobotQuantifyRoutes({
    dbQuery,
    quantifyLimiter
}));
console.log('[Routes] 旧机器人兼容路由已注册（已拆分）');

// ==================== 旧机器人兼容 API（已拆分到 src/routes/*） ====================

// 初始化错误日志表
(async () => {
    try {
        await initErrorLogsTable();
    } catch (error) {
        console.error('[DB] 初始化错误日志表失败:', error.message);
    }
})();

// ==================== 邀请/推荐 API（已拆分到 src/routes/*） ====================
app.use('/api', createHistoryRoutes({ dbQuery }));

// ==================== 抽奖转盘路由 ====================
app.use('/api/lucky-wheel', luckyWheelRoutes);

// ==================== 管理系统路由 ====================
app.use('/api/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// 错误日志中间件
app.use(errorLoggerMiddleware);

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 VituFinance API Server running on port ${PORT}`);
    console.log(`🌐 Frontend URL: https://vitufinance.com/`);

    // 初始化 BSC Provider（用于自动转账功能）
    const bscInitialized = initializeBSCProvider();
    if (bscInitialized) {
        console.log('✓ BSC 自动转账功能已启用');
    } else {
        console.warn('⚠️ BSC 自动转账功能未启用或配置不完整');
    }

    // 启动机器人到期处理定时任务（每60分钟执行一次）
    const cronJob = startCronJob(60);
    console.log('[Cron] 机器人到期处理定时任务已启动（每60分钟）');

    // 启动团队经纪人每日分红定时任务（每天凌晨1点执行）
    startTeamDividendCron(1, 0);
    console.log('[TeamCron] 团队经纪人每日分红定时任务已启动（每天01:00）');

    // 启动 BSC 充值监控服务（每60秒检查一次区块链上的新充值）
    startDepositMonitor();
    console.log('[DepositMonitor] BSC 充值自动监控服务已启动（每60秒扫描一次）');

    // ==================== 启动时安全检查（数据库已就绪）====================
    setTimeout(async () => {
      try {
        const envBSC = (process.env.PLATFORM_WALLET_ADDRESS || '').toLowerCase();
        if (envBSC) {
          const rows = await dbQuery(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'platform_wallet_bsc'"
          );
          const dbBSC = (rows?.[0]?.setting_value || '').toLowerCase();
          if (dbBSC && dbBSC !== envBSC) {
            console.error('🚨 [安全警告] 数据库钱包地址与.env不一致！可能遭受攻击！');
            console.error(`   .env BSC:  ${envBSC}`);
            console.error(`   DB  BSC:   ${dbBSC}`);
          } else {
            console.log(`✓ [安全] 钱包地址校验通过 BSC: ${envBSC}`);
          }
        }
      } catch (e) {
        console.error('[安全检查] 执行失败:', e.message);
      }
    }, 3000);

    // 启动 ETH 链充值监控服务（每120秒检查一次以太坊主网上的新充值）
    startEthDepositMonitor();
    console.log('[ETH-DepositMonitor] ETH 充值自动监控服务已启动（每120秒扫描一次）');

    // 启动模拟金额自动增长服务（每10秒增长一次）
    startSimulatedGrowthCron();
    console.log('[SimulatedGrowth] 模拟金额自动增长服务已启动（每10秒增长一次）');

    // 启动经纪人等级计算和分红服务
    setBrokerDbQuery(dbQuery);
    startBrokerLevelCron();
    console.log('[BrokerLevel] 经纪人等级服务已启动（每小时计算等级，每日/月发放分红）');

    // 优雅关闭处理
    process.on('SIGTERM', () => {
        console.log('[Server] 收到 SIGTERM 信号，正在关闭...');
        cronJob.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('[Server] 收到 SIGINT 信号，正在关闭...');
        cronJob.stop();
        process.exit(0);
    });
});
