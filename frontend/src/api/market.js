/**
 * 市场数据 API 服务
 */

import { get } from '../utils/request'
import { API_ENDPOINTS } from '../utils/constants'

/**
 * 获取24小时行情数据
 * @param {Array<string>} symbols - 交易对符号数组，如 ['BTCUSDT', 'ETHUSDT']
 * @returns {Promise} 行情数据
 */
export const getTickerData = (symbols) => {
  const symbolsParam = symbols.map(s => `"${s}"`).join(',')
  return get(`${API_ENDPOINTS.MARKET_TICKER}?symbols=[${symbolsParam}]`)
}

/**
 * 获取K线数据
 * @param {string} symbol - 交易对符号，如 'BTCUSDT'
 * @param {string} interval - K线间隔，如 '1m', '5m', '1h', '1d'
 * @param {number} limit - 数据条数，默认50
 * @returns {Promise} K线数据
 */
export const getKlineData = (symbol, interval = '1m', limit = 50) => {
  return get(API_ENDPOINTS.MARKET_KLINES, {
    symbol,
    interval,
    limit
  })
}

/**
 * 批量获取多个币种的K线数据
 * @param {Array<Object>} cryptoList - 加密货币列表
 * @param {string} interval - K线间隔
 * @param {number} limit - 数据条数
 * @returns {Promise<Array>} K线数据数组
 */
export const getBatchKlineData = async (cryptoList, interval = '1m', limit = 50) => {
  const promises = cryptoList.map(crypto =>
    getKlineData(`${crypto.symbol}USDT`, interval, limit)
      .then(data => ({
        symbol: crypto.symbol,
        data,
        success: true
      }))
      .catch(error => ({
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

