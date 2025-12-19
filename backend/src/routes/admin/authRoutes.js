/**
 * 管理后台 - 认证路由
 * 
 * 功能:
 * - 管理员登录
 * - 获取管理员信息
 * - 修改密码
 * - 上传头像
 * 
 * 创建时间: 2025-12-18
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword, verifyPassword, sanitizeString } from '../../security/index.js';
import { loginLimiter, authMiddleware } from '../../middleware/security.js';

const router = express.Router();

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_not_for_production';

// 管理员配置文件路径
const ADMIN_CONFIG_FILE = path.join(__dirname, '../../../data/admin_config.json');

/**
 * 获取管理员配置
 */
const getAdminUsers = () => {
  try {
    const dataDir = path.dirname(ADMIN_CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const data = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
    
    console.error('❌ 管理员配置文件不存在');
    return {};
  } catch (error) {
    console.error('读取管理员配置失败:', error.message);
    return {};
  }
};

/**
 * 保存管理员配置
 */
const saveAdminUsers = (users) => {
  try {
    const dataDir = path.dirname(ADMIN_CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存管理员配置失败:', error.message);
    return false;
  }
};

/**
 * 管理员登录
 * POST /api/admin/auth/login
 * 
 * Body:
 * - username: 用户名
 * - password: 密码
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }
    
    const adminUsers = getAdminUsers();
    const user = adminUsers[sanitizeString(username)];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 验证密码
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { 
        username: user.username,
        role: user.role || 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // 更新最后登录时间
    user.lastLogin = new Date().toISOString();
    adminUsers[username] = user;
    saveAdminUsers(adminUsers);
    
    console.log(`[Admin] 管理员登录: ${username}`);
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          username: user.username,
          role: user.role || 'admin',
          avatar: user.avatar || null
        }
      }
    });
  } catch (error) {
    console.error('[Admin] 登录失败:', error.message);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

/**
 * 获取管理员信息
 * GET /api/admin/auth/info
 */
router.get('/info', authMiddleware, (req, res) => {
  try {
    const adminUsers = getAdminUsers();
    const user = adminUsers[req.adminUser.username];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        username: user.username,
        role: user.role || 'admin',
        avatar: user.avatar || null,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error) {
    console.error('[Admin] 获取管理员信息失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取信息失败'
    });
  }
});

/**
 * 修改密码
 * POST /api/admin/auth/change-password
 * 
 * Body:
 * - old_password: 旧密码
 * - new_password: 新密码
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: '旧密码和新密码不能为空'
      });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6位'
      });
    }
    
    const adminUsers = getAdminUsers();
    const user = adminUsers[req.adminUser.username];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证旧密码
    const isValid = await verifyPassword(old_password, user.password);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '旧密码错误'
      });
    }
    
    // 加密新密码
    const hashedPassword = await hashPassword(new_password);
    
    // 更新密码
    user.password = hashedPassword;
    adminUsers[req.adminUser.username] = user;
    saveAdminUsers(adminUsers);
    
    console.log(`[Admin] 管理员修改密码: ${req.adminUser.username}`);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('[Admin] 修改密码失败:', error.message);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

export default router;

