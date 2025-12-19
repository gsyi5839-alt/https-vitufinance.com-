/**
 * API 接口统一封装
 */

import request from './request'
import type { ApiResponse } from '@/types'

/**
 * 健康检查响应接口
 */
interface HealthResponse {
  success: boolean
  status: string
  uptime: number
  timestamp: string
}

/**
 * 用户信息接口
 */
interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  role?: string
  createdAt?: string
}

/**
 * 登录请求数据
 */
interface LoginData {
  username: string
  password: string
}

/**
 * 注册请求数据
 */
interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword?: string
}

/**
 * 登录响应数据
 */
interface LoginResponse {
  success: boolean
  token: string
  user: UserInfo
  expiresIn?: number
}

/**
 * 统计数据接口
 */
interface StatsData {
  totalUsers?: number
  activeUsers?: number
  totalTransactions?: number
  totalVolume?: number
  [key: string]: any
}

// API 接口封装
export const api = {
  /**
   * 健康检查
   * @returns 健康检查结果
   */
  health(): Promise<HealthResponse> {
    return request.get<HealthResponse>('/api/health')
  },
  
  /**
   * 获取用户列表
   * @returns 用户列表
   */
  getUsers(): Promise<UserInfo[]> {
    return request.get<UserInfo[]>('/api/users')
  },
  
  /**
   * 获取统计数据
   * @returns 统计数据
   */
  getStats(): Promise<StatsData> {
    return request.get<StatsData>('/api/stats')
  },
  
  /**
   * 用户登录
   * @param data - 登录数据
   * @returns 登录响应（包含token和用户信息）
   */
  login(data: LoginData): Promise<LoginResponse> {
    return request.post<LoginResponse>('/api/auth/login', data)
  },
  
  /**
   * 用户注册
   * @param data - 注册数据
   * @returns 注册响应
   */
  register(data: RegisterData): Promise<ApiResponse<UserInfo>> {
    return request.post<ApiResponse<UserInfo>>('/api/auth/register', data)
  },
  
  /**
   * 获取用户信息
   * @returns 用户信息
   */
  getUserInfo(): Promise<UserInfo> {
    return request.get<UserInfo>('/api/user/info')
  }
}

export default api

