/**
 * 项目常量配置
 */

import type { CryptoInfo, IconPaths, ApiEndpoints, UpdateIntervals } from '@/types'

/**
 * 加密货币列表配置
 */
export const CRYPTO_LIST: CryptoInfo[] = [
  { name: 'Bitcoin', symbol: 'BTC', icon: 'btc.png' },
  { name: 'Ethereum', symbol: 'ETH', icon: 'eth.png' },
  { name: 'BNB', symbol: 'BNB', icon: 'bnb.png' },
  { name: 'Solana', symbol: 'SOL', icon: 'sol.png' },
  { name: 'XRP', symbol: 'XRP', icon: 'xrp.png' },
  { name: 'Cardano', symbol: 'ADA', icon: 'ada.png' },
  { name: 'Dogecoin', symbol: 'DOGE', icon: 'doge.png' },
  { name: 'Worldcoin', symbol: 'WLD', icon: 'wld.png' },
  { name: 'Pepe', symbol: 'PEPE', icon: 'pepe.png' },
  { name: 'Arbitrum', symbol: 'ARB', icon: 'arb.png' },
  { name: 'Litecoin', symbol: 'LTC', icon: 'image.png' }
]

/**
 * API 端点配置
 */
export const API_ENDPOINTS: ApiEndpoints = {
  // 市场数据
  MARKET_TICKER: '/api/market/ticker',
  MARKET_KLINES: '/api/market/klines',
  
  // 用户相关
  USER_LOGIN: '/api/auth/login',
  USER_REGISTER: '/api/auth/register',
  USER_INFO: '/api/user/info',
  
  // 健康检查
  HEALTH: '/api/health',
  DB_HEALTH: '/api/db/health'
}

/**
 * 更新间隔配置（毫秒）
 */
export const UPDATE_INTERVALS: UpdateIntervals = {
  MARKET_DATA: 300000,      // 5分钟
  FAST_UPDATE: 60000,       // 1分钟
  SLOW_UPDATE: 600000       // 10分钟
}

/**
 * 图标路径配置
 */
export const ICON_PATHS: IconPaths = {
  CRYPTO: '/static/icon/',
  SERVICE: '/static/four/',
  BRAND: '/static/one/',
  INDEX: '/static/index/',
  TWO: '/static/two/'
}

/**
 * 小数位精度配置
 */
export const DECIMAL_PRECISION = {
  // 小额币种（PEPE, SHIB等）
  MICRO: 8,
  // 中等价格币种（DOGE, WLD, XRP等）
  SMALL: 4,
  // 主流币种（BTC, ETH等）
  NORMAL: 2
} as const

/**
 * 小额币种列表
 */
export const MICRO_COINS: readonly string[] = ['PEPE', 'SHIB'] as const

/**
 * 中等价格币种列表
 */
export const SMALL_COINS: readonly string[] = ['DOGE', 'WLD', 'ARB', 'XRP', 'ADA'] as const

/**
 * 路由路径
 */
export const ROUTES = {
  HOME: '/',
  INDEX: '/index',
  ONE: '/one',
  TWO: '/two',
  FOUR: '/four',
  FIVE: '/five',
  ABOUT: '/about',
  DASHBOARD: '/dashboard'
} as const

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  LANGUAGE: 'language',
  USER_INFO: 'userInfo',
  THEME: 'theme'
} as const

/**
 * HTTP 状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const
