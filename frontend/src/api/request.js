/**
 * Axios 请求封装
 * 包含请求/响应拦截器、错误处理、Token管理
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 创建 axios 实例
 * 生产环境使用相对路径，开发环境使用 localhost
 */
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器
 */
service.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
service.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // 如果返回的状态码不是成功状态,则判断为错误
    if (res?.success === false) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    
    // 直接返回响应数据
    return res
  },
  (error) => {
    console.error('响应错误:', error)
    
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 401:
          ElMessage.error('未授权,请重新登录')
          // 清除 token 并跳转到登录页
          localStorage.removeItem('token')
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时,请稍后重试')
    } else {
      ElMessage.error('网络错误,请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

/**
 * 封装请求方法
 */
const request = {
  /**
   * GET 请求
   */
  get(url, config) {
    return service.get(url, config)
  },

  /**
   * POST 请求
   */
  post(url, data, config) {
    return service.post(url, data, config)
  },

  /**
   * PUT 请求
   */
  put(url, data, config) {
    return service.put(url, data, config)
  },

  /**
   * DELETE 请求
   */
  delete(url, config) {
    return service.delete(url, config)
  },

  /**
   * PATCH 请求
   */
  patch(url, data, config) {
    return service.patch(url, data, config)
  }
}

export default request
