/**
 * 管理系统 API 接口
 * 
 * 认证方式：JWT Token（通过 Authorization Header）
 * Token 存储在 localStorage，不使用 Cookie
 * 不需要 CSRF 保护（因为使用 JWT + Header 认证）
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 JWT Token
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 JWT Token
    const token = localStorage.getItem('admin_token')
    if (token) {
      // 使用 Bearer Token 认证
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
request.interceptors.response.use(
  response => {
    return response.data
  },
  (error) => {
    // 获取请求URL和错误信息
    const requestUrl = error.config?.url || ''
    const message = error.response?.data?.message || '请求失败'
    
    // 401 未授权处理
    if (error.response?.status === 401) {
      // 登录接口返回401表示密码错误，不触发页面跳转
      // 直接返回错误，让登录页面处理
      if (requestUrl.includes('/login')) {
        return Promise.reject(error)
      }
      
      // 其他接口返回401表示token过期，需要跳转登录页
      localStorage.removeItem('admin_token')
      ElMessage.error('登录已过期，请重新登录')
      // 使用Vue Router跳转，避免页面刷新
      window.location.href = '/admin/login'
      return Promise.reject(error)
    }
    
    // 403 禁止访问
    if (error.response?.status === 403) {
      ElMessage.error('没有权限执行此操作')
      return Promise.reject(error)
    }
    
    // 其他错误（非登录接口才显示通用错误消息）
    if (!requestUrl.includes('/login')) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

// ==================== 认证相关 ====================

/**
 * 管理员登录
 */
export const login = (data) => {
  return request.post('/login', data)
}

/**
 * 获取管理员信息
 */
export const getAdminInfo = () => {
  return request.get('/info')
}

// ==================== 仪表盘统计 ====================

/**
 * 获取仪表盘统计数据
 */
export const getDashboardStats = () => {
  return request.get('/dashboard/stats')
}

// ==================== 用户管理 ====================

/**
 * 获取用户列表
 */
export const getUsers = (params) => {
  return request.get('/users', { params })
}

/**
 * 获取用户详情
 */
export const getUserDetail = (walletAddress) => {
  return request.get(`/users/${walletAddress}`)
}

/**
 * 更新用户余额
 */
export const updateUserBalance = (walletAddress, data) => {
  return request.put(`/users/${walletAddress}/balance`, data)
}

/**
 * 封禁用户
 */
export const banUser = (walletAddress, data) => {
  return request.post(`/users/${walletAddress}/ban`, data)
}

/**
 * 解封用户
 */
export const unbanUser = (walletAddress) => {
  return request.post(`/users/${walletAddress}/unban`)
}

// ==================== 充值记录 ====================

/**
 * 获取充值记录列表
 */
export const getDeposits = (params) => {
  return request.get('/deposits', { params })
}

/**
 * 更新充值状态
 */
export const updateDepositStatus = (id, status) => {
  return request.put(`/deposits/${id}/status`, { status })
}

// ==================== 提款记录 ====================

/**
 * 获取提款记录列表
 */
export const getWithdrawals = (params) => {
  return request.get('/withdrawals', { params })
}

/**
 * 处理提款请求
 */
export const processWithdrawal = (id, data) => {
  return request.put(`/withdrawals/${id}/process`, data)
}

/**
 * 自动转账
 */
export const autoTransferWithdrawal = (id, data) => {
  return request.post(`/withdrawals/${id}/auto-transfer`, data)
}

/**
 * 获取平台钱包信息
 */
export const getWalletInfo = () => {
  return request.get('/wallet-info')
}

/**
 * 获取提款的转账记录
 */
export const getWithdrawalTransferRecord = (id) => {
  return request.get(`/withdrawals/${id}/transfer-record`)
}

// ==================== 机器人购买记录 ====================

/**
 * 获取机器人统计数据
 */
export const getRobotStats = () => {
  return request.get('/robots/stats')
}

/**
 * 获取机器人购买列表
 */
export const getRobotPurchases = (params) => {
  return request.get('/robots', { params })
}

/**
 * 获取机器人购买详情
 */
export const getRobotDetail = (id) => {
  return request.get(`/robots/${id}`)
}

/**
 * 获取用户的所有机器人数据
 */
export const getUserRobots = (walletAddress) => {
  return request.get(`/robots/user/${walletAddress}`)
}

/**
 * 获取量化日志列表
 */
export const getQuantifyLogs = (params) => {
  return request.get('/quantify-logs', { params })
}

/**
 * 获取机器人收益汇总统计
 */
export const getRobotEarningsSummary = () => {
  return request.get('/robots/earnings-summary')
}

// ==================== 公告管理 ====================

/**
 * 获取公告列表
 */
export const getAnnouncements = (params) => {
  return request.get('/announcements', { params })
}

/**
 * 创建公告
 */
export const createAnnouncement = (data) => {
  return request.post('/announcements', data)
}

/**
 * 更新公告
 */
export const updateAnnouncement = (id, data) => {
  return request.put(`/announcements/${id}`, data)
}

/**
 * 删除公告
 */
export const deleteAnnouncement = (id) => {
  return request.delete(`/announcements/${id}`)
}

// ==================== 推荐关系 ====================

/**
 * 获取推荐关系列表
 */
export const getReferrals = (params) => {
  return request.get('/referrals', { params })
}

// ==================== 资质文件 ====================

/**
 * 获取资质文件配置
 */
export const getDocuments = () => {
  return request.get('/documents')
}

export default request
