/**
 * 统一的 HTTP 请求工具
 * 提供统一的错误处理和请求拦截
 */

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
const requestInterceptor = (url, options) => {
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
const responseInterceptor = async (response) => {
  if (!response.ok) {
    const error = new Error(`HTTP Error ${response.status}`)
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
const errorHandler = (error) => {
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
    switch (error.status) {
      case 400:
        return Promise.reject(new Error('请求参数错误'))
      case 401:
        // 清除 token 并跳转到登录
        localStorage.removeItem('token')
        return Promise.reject(new Error('未授权，请重新登录'))
      case 403:
        return Promise.reject(new Error('拒绝访问'))
      case 404:
        return Promise.reject(new Error('请求的资源不存在'))
      case 500:
        return Promise.reject(new Error('服务器内部错误'))
      case 502:
        return Promise.reject(new Error('网关错误'))
      case 503:
        return Promise.reject(new Error('服务不可用'))
      default:
        return Promise.reject(new Error(`请求失败: ${error.status}`))
    }
  }

  return Promise.reject(error)
}

/**
 * 统一请求函数
 * @param {string} url - 请求 URL
 * @param {object} options - fetch 选项
 * @returns {Promise} 请求结果
 */
export const request = async (url, options = {}) => {
  // 默认选项
  const defaultOptions = {
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
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

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
 */
export const get = (url, params = {}, options = {}) => {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  const fullUrl = queryString ? `${url}?${queryString}` : url

  return request(fullUrl, {
    method: 'GET',
    ...options
  })
}

/**
 * POST 请求
 */
export const post = (url, data = {}, options = {}) => {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * PUT 请求
 */
export const put = (url, data = {}, options = {}) => {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * DELETE 请求
 */
export const del = (url, options = {}) => {
  return request(url, {
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

