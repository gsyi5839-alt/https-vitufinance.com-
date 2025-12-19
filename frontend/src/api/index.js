/**
 * API 接口统一封装
 */

import request from './request'

// API 接口封装
export const api = {
  /**
   * 健康检查
   * @returns 健康检查结果
   */
  health() {
    return request.get('/api/health')
  },
  
  /**
   * 获取用户列表
   * @returns 用户列表
   */
  getUsers() {
    return request.get('/api/users')
  },
  
  /**
   * 获取统计数据
   * @returns 统计数据
   */
  getStats() {
    return request.get('/api/stats')
  },
  
  /**
   * 用户登录
   * @param data - 登录数据
   * @returns 登录响应（包含token和用户信息）
   */
  login(data) {
    return request.post('/api/auth/login', data)
  },
  
  /**
   * 用户注册
   * @param data - 注册数据
   * @returns 注册响应
   */
  register(data) {
    return request.post('/api/auth/register', data)
  },
  
  /**
   * 获取用户信息
   * @returns 用户信息
   */
  getUserInfo() {
    return request.get('/api/user/info')
  }
}

export default api
