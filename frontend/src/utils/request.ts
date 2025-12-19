/**
 * 统一的 HTTP 请求工具
 * 提供统一的错误处理和请求拦截
 */

import type { RequestOptions } from '@/types'

/**
 * HTTP 请求配置
 */
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000
}

/**
 * 请求拦截器
 */
const requestInterceptor = (url: string, options: RequestOptions): { url: string; options: RequestOptions } => {
  // 添加 token
  const token = localStorage.getItem('token')
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  }

  // 添加时间戳防止缓存
  if (options.method === 'GET') {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}_t=${Date.now()}`
  }

  return { url, options }
}

/**
 * 响应拦截器
 */
const responseInterceptor = async (response: Response): Promise<any> => {
  if (!response.ok) {
    const error = new Error(`HTTP Error ${response.status}`) as Error & { status: number; response: Response }
    error.status = response.status
    error.response = response
    throw error
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }

  return await response.text()
}

/**
 * 错误处理器
 */
const errorHandler = (error: any): Promise<never> => {
  console.error('❌ 请求失败:', error)

  // 网络错误
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return Promise.reject(new Error('网络连接失败，请检查网络设置'))
  }

  // 超时错误
  if (error.name === 'AbortError') {
    return Promise.reject(new Error('请求超时'))
  }

  // HTTP 错误
  if (error.status) {
    const errorMessages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '拒绝访问',
      404: '请求的资源不存在',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用'
    }

    // 401 时清除 token
    if (error.status === 401) {
      localStorage.removeItem('token')
    }

    const message = errorMessages[error.status] || `请求失败: ${error.status}`
    return Promise.reject(new Error(message))
  }

  return Promise.reject(error)
}

/**
 * 统一请求函数
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @returns 请求结果
 */
export const request = async <T = any>(url: string, options: RequestOptions = {}): Promise<T> => {
  // 默认选项
  const defaultOptions: RequestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  }

  // 完整 URL
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${config.baseURL}${url}`

  // 请求拦截
  const { url: interceptedUrl, options: interceptedOptions } = requestInterceptor(
    fullUrl,
    defaultOptions
  )

  try {
    // 超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.timeout)

    const response = await fetch(interceptedUrl, {
      ...interceptedOptions,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // 响应拦截
    return await responseInterceptor(response)

  } catch (error) {
    return errorHandler(error)
  }
}

/**
 * GET 请求
 * @param url - 请求 URL
 * @param params - 查询参数
 * @param options - 请求选项
 * @returns 请求结果
 */
export const get = <T = any>(url: string, params: Record<string, any> = {}, options: RequestOptions = {}): Promise<T> => {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  const fullUrl = queryString ? `${url}?${queryString}` : url

  return request<T>(fullUrl, {
    method: 'GET',
    ...options
  })
}

/**
 * POST 请求
 * @param url - 请求 URL
 * @param data - 请求数据
 * @param options - 请求选项
 * @returns 请求结果
 */
export const post = <T = any>(url: string, data: any = {}, options: RequestOptions = {}): Promise<T> => {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * PUT 请求
 * @param url - 请求 URL
 * @param data - 请求数据
 * @param options - 请求选项
 * @returns 请求结果
 */
export const put = <T = any>(url: string, data: any = {}, options: RequestOptions = {}): Promise<T> => {
  return request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * DELETE 请求
 * @param url - 请求 URL
 * @param options - 请求选项
 * @returns 请求结果
 */
export const del = <T = any>(url: string, options: RequestOptions = {}): Promise<T> => {
  return request<T>(url, {
    method: 'DELETE',
    ...options
  })
}

export default {
  request,
  get,
  post,
  put,
  delete: del
}
