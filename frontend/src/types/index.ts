/**
 * VituFinance 项目类型定义
 */

import type { Ref } from 'vue'

/**
 * 加密货币信息接口
 */
export interface CryptoInfo {
  name: string
  symbol: string
  icon: string
}

/**
 * 加密货币市场数据接口
 */
export interface CryptoMarketData extends CryptoInfo {
  price: string
  change: number | string
  chartData?: number[]
  volume?: string
  lastUpdate?: number
}

/**
 * Binance Ticker 数据接口
 */
export interface BinanceTickerData {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  volume: string
  quoteVolume: string
  highPrice: string
  lowPrice: string
}

/**
 * Binance K线数据接口
 * [openTime, open, high, low, close, volume, closeTime, ...]
 */
export type BinanceKlineData = [
  number,  // openTime
  string,  // open
  string,  // high
  string,  // low
  string,  // close
  string,  // volume
  number,  // closeTime
  string,  // quoteVolume
  number,  // trades
  string,  // takerBuyBaseVolume
  string,  // takerBuyQuoteVolume
  string   // unused
]

/**
 * API 响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * HTTP 请求选项
 */
export interface RequestOptions extends RequestInit {
  timeout?: number
}

/**
 * Composable 返回值类型
 */
export interface UseCryptoMarketReturn {
  cryptoList: Ref<CryptoMarketData[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchMarketData: () => Promise<void>
  startAutoUpdate: (interval?: number) => void
  stopAutoUpdate: () => void
}

/**
 * 图标路径配置接口
 */
export interface IconPaths {
  CRYPTO: string
  SERVICE: string
  BRAND: string
  INDEX: string
  TWO: string
}

/**
 * API 端点配置接口
 */
export interface ApiEndpoints {
  MARKET_TICKER: string
  MARKET_KLINES: string
  USER_LOGIN: string
  USER_REGISTER: string
  USER_INFO: string
  HEALTH: string
  DB_HEALTH: string
}

/**
 * 更新间隔配置接口
 */
export interface UpdateIntervals {
  MARKET_DATA: number
  FAST_UPDATE: number
  SLOW_UPDATE: number
}

/**
 * 性能监控数据接口
 */
export interface PerformanceData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  timestamp: number
  url: string
  userAgent: string
}

/**
 * 性能监控配置接口
 */
export interface PerformanceConfig {
  enableConsoleLog?: boolean
  enableAnalytics?: boolean
  apiEndpoint?: string
}

/**
 * 路由元信息接口
 */
export interface RouteMeta {
  title?: string
  requiresAuth?: boolean
  icon?: string
  hidden?: boolean
}

