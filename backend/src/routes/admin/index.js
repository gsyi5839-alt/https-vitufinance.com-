/**
 * 管理后台路由 - 主入口
 * 
 * 优化说明:
 * - 将原来5647行的 adminRoutes.js 拆分成多个模块
 * - 每个模块负责单一功能,代码行数控制在500行以内
 * - 添加缓存支持,减少数据库查询
 * - 使用数据库索引优化查询性能
 * - 添加响应压缩
 * 
 * 模块划分:
 * - authRoutes: 认证相关 (登录、信息获取)
 * - dashboardRoutes: 仪表盘统计
 * - userRoutes: 用户管理
 * - depositRoutes: 充值记录
 * - withdrawalRoutes: 提款记录
 * - robotRoutes: 机器人管理
 * - announcementRoutes: 公告管理
 * - referralRoutes: 推荐关系
 * - settingsRoutes: 系统设置
 * 
 * 创建时间: 2025-12-18
 */
import express from 'express';
import compression from 'compression';
import { authMiddleware } from '../../middleware/security.js';

// 导入各个模块路由
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import userRoutes from './userRoutes.js';
import depositRoutes from './depositRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';

const router = express.Router();

// ==================== 中间件 ====================

// 响应压缩 (优化传输速度)
router.use(compression({
  level: 6, // 压缩级别 (0-9)
  threshold: 1024, // 只压缩大于1KB的响应
  filter: (req, res) => {
    // 只压缩JSON和文本响应
    const contentType = res.getHeader('Content-Type');
    return /json|text/.test(contentType);
  }
}));

// ==================== 公开路由 (无需认证) ====================

// 认证相关
router.use('/auth', authRoutes);

// ==================== 受保护路由 (需要认证) ====================

// 仪表盘
router.use('/dashboard', authMiddleware, dashboardRoutes);

// 用户管理
router.use('/users', authMiddleware, userRoutes);

// 充值记录
router.use('/deposits', authMiddleware, depositRoutes);

// 提款记录
router.use('/withdrawals', authMiddleware, withdrawalRoutes);

// 机器人管理
// router.use('/robots', authMiddleware, robotRoutes);

// 公告管理
// router.use('/announcements', authMiddleware, announcementRoutes);

// 推荐关系
// router.use('/referrals', authMiddleware, referralRoutes);

// 系统设置
// router.use('/settings', authMiddleware, settingsRoutes);

// ==================== 健康检查 ====================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;

