/**
 * 市场数据 API 服务
 */

import { get } from '../utils/request'
import { API_ENDPOINTS } from '../utils/constants'
import type { BinanceTickerData, BinanceKlineData, CryptoInfo } from '@/types'

/**
 * K线数据批量获取结果
 */
interface KlineDataResult {
  symbol: string
  data?: BinanceKlineData[]
  error?: string
  success: boolean
}

/**
 * 获取24小时行情数据
 * @param symbols - 交易对符号数组，如 ['BTCUSDT', 'ETHUSDT']
 * @returns 行情数据
 */
export const getTickerData = (symbols: string[]): Promise<BinanceTickerData[]> => {
  const symbolsParam = symbols.map(s => `"${s}"`).join(',')
  return get<BinanceTickerData[]>(`${API_ENDPOINTS.MARKET_TICKER}?symbols=[${symbolsParam}]`)
}

/**
 * 获取K线数据
 * @param symbol - 交易对符号，如 'BTCUSDT'
 * @param interval - K线间隔，如 '1m', '5m', '1h', '1d'
 * @param limit - 数据条数，默认50
 * @returns K线数据
 */
export const getKlineData = (
  symbol: string, 
  interval: string = '1m', 
  limit: number = 50
): Promise<BinanceKlineData[]> => {
  return get<BinanceKlineData[]>(API_ENDPOINTS.MARKET_KLINES, {
    symbol,
    interval,
    limit
  })
}

/**
 * 批量获取多个币种的K线数据
 * @param cryptoList - 加密货币列表
 * @param interval - K线间隔
 * @param limit - 数据条数
 * @returns K线数据数组
 */
export const getBatchKlineData = async (
  cryptoList: CryptoInfo[], 
  interval: string = '1m', 
  limit: number = 50
): Promise<KlineDataResult[]> => {
  const promises = cryptoList.map(crypto =>
    getKlineData(`${crypto.symbol}USDT`, interval, limit)
      .then(data => ({
        symbol: crypto.symbol,
        data,
        success: true
      }))
      .catch((error: Error) => ({
        symbol: crypto.symbol,
        error: error.message,
        success: false
      }))
  )

  return await Promise.all(promises)
}

export default {
  getTickerData,
  getKlineData,
  getBatchKlineData
}
