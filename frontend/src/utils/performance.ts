/**
 * 性能监控工具
 * 基于 Web Vitals 实现前端性能监控
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'
import type { PerformanceConfig, PerformanceData } from '@/types'

/**
 * 性能评级类型
 */
type PerformanceRating = 'good' | 'needs-improvement' | 'poor'

/**
 * 性能监控配置
 */
const config: PerformanceConfig = {
  enableConsoleLog: import.meta.env.DEV,
  enableAnalytics: import.meta.env.PROD,
  apiEndpoint: '/api/analytics/performance'
}

/**
 * 发送性能数据到服务器
 * @param data - 性能数据
 */
const sendToAnalytics = async (data: PerformanceData): Promise<void> => {
  if (!config.apiEndpoint || !config.enableAnalytics) return

  try {
    // 使用 sendBeacon API，不阻塞页面卸载
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      navigator.sendBeacon(config.apiEndpoint, blob)
    } else {
      // 降级方案
      await fetch(config.apiEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      })
    }
  } catch (error) {
    console.error('❌ 发送性能数据失败:', error)
  }
}

/**
 * 本地存储性能指标
 * @param data - 性能数据
 */
const storeMetricLocally = (data: PerformanceData): void => {
  try {
    const key = 'vitu_performance_metrics'
    const stored = localStorage.getItem(key)
    const metrics: PerformanceData[] = stored ? JSON.parse(stored) : []
    
    // 只保留最近100条记录
    metrics.push(data)
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    localStorage.setItem(key, JSON.stringify(metrics))
  } catch (error) {
    console.warn('存储性能指标失败:', error)
  }
}

/**
 * 获取性能评级的中文说明
 * @param rating - 性能评级
 * @returns 中文说明
 */
const getRatingText = (rating: PerformanceRating): string => {
  const texts: Record<PerformanceRating, string> = {
    'good': '✅ 优秀',
    'needs-improvement': '⚠️ 需要改进',
    'poor': '❌ 较差'
  }
  return texts[rating] || '未知'
}

/**
 * 处理性能指标
 * @param metric - Web Vitals 指标
 */
const handleMetric = (metric: Metric): void => {
  const data: PerformanceData = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating as PerformanceRating,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent
  }

  // 控制台输出（开发环境）
  if (config.enableConsoleLog) {
    const emojiMap: Record<PerformanceRating, string> = {
      'good': '✅',
      'needs-improvement': '⚠️',
      'poor': '❌'
    }
    const emoji = emojiMap[metric.rating as PerformanceRating] || '📊'

    console.log(
      `${emoji} Performance [${metric.name}]:`,
      `${metric.value.toFixed(2)}ms`,
      getRatingText(metric.rating as PerformanceRating)
    )
  }

  // 发送到分析服务（生产环境）
  if (config.enableAnalytics) {
    sendToAnalytics(data)
  }

  // 存储到 localStorage
  storeMetricLocally(data)
}

/**
 * 初始化性能监控
 * @param customConfig - 自定义配置
 */
export const initPerformanceMonitoring = (customConfig: Partial<PerformanceConfig> = {}): void => {
  Object.assign(config, customConfig)

  console.log('🚀 性能监控已启动')

  // 监控 Cumulative Layout Shift (累积布局偏移)
  onCLS(handleMetric)

  // 监控 Interaction to Next Paint (交互到下次绘制)
  onINP(handleMetric)

  // 监控 First Contentful Paint (首次内容绘制)
  onFCP(handleMetric)

  // 监控 Largest Contentful Paint (最大内容绘制)
  onLCP(handleMetric)

  // 监控 Time to First Byte (首字节时间)
  onTTFB(handleMetric)
}

/**
 * 获取本地存储的性能指标
 * @returns 性能指标数组
 */
export const getLocalMetrics = (): PerformanceData[] => {
  try {
    const key = 'vitu_performance_metrics'
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 清除本地性能指标
 */
export const clearLocalMetrics = (): void => {
  localStorage.removeItem('vitu_performance_metrics')
  console.log('🗑️ 性能指标已清除')
}

/**
 * 生成性能报告
 */
export const generatePerformanceReport = (): void => {
  const metrics = getLocalMetrics()
  
  if (metrics.length === 0) {
    console.log('📊 暂无性能数据')
    return
  }

  console.group('📊 VituFinance 性能报告')
  console.log(`总样本数: ${metrics.length}`)
  console.log(`时间范围: ${new Date(metrics[0].timestamp).toLocaleString()} - ${new Date(metrics[metrics.length - 1].timestamp).toLocaleString()}`)
  console.log('─'.repeat(60))
  
  // 按指标名称分组
  const grouped: Record<string, PerformanceData[]> = {}
  metrics.forEach(m => {
    if (!grouped[m.name]) grouped[m.name] = []
    grouped[m.name].push(m)
  })

  // 计算统计信息
  Object.entries(grouped).forEach(([name, values]) => {
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length
    const latest = values[values.length - 1]
    const min = Math.min(...values.map(v => v.value))
    const max = Math.max(...values.map(v => v.value))
    
    console.group(`${name}`)
    console.log(`平均值: ${avg.toFixed(2)}ms`)
    console.log(`最新值: ${latest.value.toFixed(2)}ms ${getRatingText(latest.rating)}`)
    console.log(`最小值: ${min.toFixed(2)}ms`)
    console.log(`最大值: ${max.toFixed(2)}ms`)
    console.log(`样本数: ${values.length}`)
    console.groupEnd()
  })

  console.groupEnd()
}

/**
 * 监控 API 请求性能
 * @param name - API 名称
 * @param apiCall - API 调用函数
 * @returns API 调用结果
 */
export const measureApiPerformance = async <T = any>(
  name: string, 
  apiCall: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now()
  
  try {
    const result = await apiCall()
    const duration = performance.now() - startTime

    if (config.enableConsoleLog) {
      const emoji = duration < 1000 ? '✅' : duration < 3000 ? '⚠️' : '❌'
      console.log(`${emoji} API [${name}]: ${duration.toFixed(2)}ms`)
    }

    // 记录到性能数据
    const data: PerformanceData = {
      name: `api_${name}`,
      value: duration,
      rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
      delta: duration,
      id: `api_${Date.now()}`,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    storeMetricLocally(data)
    
    if (config.enableAnalytics) {
      sendToAnalytics(data)
    }

    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`❌ API [${name}] 失败 (${duration.toFixed(2)}ms):`, error)
    throw error
  }
}

/**
 * 监控组件渲染性能
 * @param componentName - 组件名称
 * @returns 结束计时函数
 */
export const measureComponentRender = (componentName: string): () => void => {
  const startTime = performance.now()
  
  return () => {
    const duration = performance.now() - startTime
    
    if (config.enableConsoleLog && duration > 16) { // 超过一帧的时间
      console.warn(`⚠️ 组件 [${componentName}] 渲染耗时: ${duration.toFixed(2)}ms`)
    }

    if (duration > 50) { // 超过50ms记录
      const data: PerformanceData = {
        name: `component_${componentName}`,
        value: duration,
        rating: duration < 16 ? 'good' : duration < 50 ? 'needs-improvement' : 'poor',
        delta: duration,
        id: `component_${Date.now()}`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
      storeMetricLocally(data)
    }
  }
}

/**
 * 全局性能监控接口（仅开发环境）
 */
interface PerformanceMonitor {
  getMetrics: () => PerformanceData[]
  clearMetrics: () => void
  generateReport: () => void
}

/**
 * 扩展 Window 接口
 */
declare global {
  interface Window {
    __performanceMonitor?: PerformanceMonitor
  }
}

// 添加全局访问（仅开发环境）
if (import.meta.env.DEV) {
  window.__performanceMonitor = {
    getMetrics: getLocalMetrics,
    clearMetrics: clearLocalMetrics,
    generateReport: generatePerformanceReport
  }
  console.log('💡 提示: 在控制台使用 window.__performanceMonitor 查看性能数据')
}

export default {
  initPerformanceMonitoring,
  getLocalMetrics,
  clearLocalMetrics,
  generatePerformanceReport,
  measureApiPerformance,
  measureComponentRender
}

