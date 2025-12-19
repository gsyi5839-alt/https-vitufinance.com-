/**
 * 格式化工具函数
 */

/**
 * 格式化加密货币价格
 * @param price - 价格
 * @param symbol - 币种符号
 * @returns 格式化后的价格
 */
export const formatPrice = (price: string | number, symbol: string): string => {
  const p = parseFloat(price.toString())
  
  if (isNaN(p)) return '$0.00'
  
  // 小额币种显示更多小数位
  if (['PEPE', 'SHIB'].includes(symbol)) {
    return '$' + p.toFixed(8)
  } 
  // 中等价格币种
  else if (['DOGE', 'WLD', 'ARB', 'XRP', 'ADA'].includes(symbol)) {
    return '$' + p.toFixed(4)
  } 
  // 高价币种
  else {
    return '$' + p.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }
}

/**
 * 格式化涨跌幅
 * @param change - 涨跌幅
 * @returns 格式化后的涨跌幅
 */
export const formatChange = (change: string | number): string => {
  const c = parseFloat(change.toString())
  
  if (isNaN(c)) return '0.00%'
  
  return (c >= 0 ? '+' : '') + c.toFixed(2) + '%'
}

/**
 * 获取 Binance 交易对符号
 * @param symbol - 币种符号
 * @returns Binance 交易对符号
 */
export const getBinanceSymbol = (symbol: string): string => {
  return symbol + 'USDT'
}

/**
 * 格式化大数字（如交易量）
 * @param num - 数字
 * @returns 格式化后的数字
 */
export const formatVolume = (num: string | number): string => {
  const n = parseFloat(num.toString())
  
  if (isNaN(n)) return '0'
  
  if (n >= 1e9) {
    return (n / 1e9).toFixed(2) + 'B'
  } else if (n >= 1e6) {
    return (n / 1e6).toFixed(2) + 'M'
  } else if (n >= 1e3) {
    return (n / 1e3).toFixed(2) + 'K'
  } else {
    return n.toFixed(2)
  }
}
