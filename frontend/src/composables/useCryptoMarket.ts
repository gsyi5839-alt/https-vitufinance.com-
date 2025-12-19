/**
 * 加密货币市场数据 Composable
 * 用于获取和管理加密货币实时行情
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { formatPrice, formatChange, getBinanceSymbol } from '../utils/format'
import type { CryptoMarketData, BinanceTickerData, BinanceKlineData, UseCryptoMarketReturn } from '@/types'

export function useCryptoMarket(initialCryptoList: CryptoMarketData[] = []): UseCryptoMarketReturn {
  const cryptoList = ref<CryptoMarketData[]>(initialCryptoList)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  let timer: number | null = null

  /**
   * 获取市场数据
   */
  const fetchMarketData = async (): Promise<void> => {
    if (cryptoList.value.length === 0) return

    loading.value = true
    error.value = null

    try {
      const baseUrl = ''

      // 1. 获取 24h Ticker 数据
      const symbols = cryptoList.value
        .map(c => `"${getBinanceSymbol(c.symbol)}"`)
        .join(',')
      
      const tickerUrl = `${baseUrl}/api/market/ticker?symbols=[${symbols}]`
      const tickerRes = await fetch(tickerUrl)

      if (!tickerRes.ok) {
        throw new Error(`HTTP ${tickerRes.status}: ${tickerRes.statusText}`)
      }

      const tickerData: BinanceTickerData[] = await tickerRes.json()

      // 更新价格和涨跌幅
      tickerData.forEach((item: BinanceTickerData) => {
        const symbol = item.symbol.replace('USDT', '')
        const crypto = cryptoList.value.find(c => c.symbol === symbol)
        if (crypto) {
          crypto.price = formatPrice(item.lastPrice, symbol)
          // 根据初始值类型决定返回格式
          const initialChangeType = typeof crypto.change
          if (initialChangeType === 'string') {
            crypto.change = formatChange(item.priceChangePercent)
          } else {
            crypto.change = parseFloat(item.priceChangePercent)
          }
        }
      })

      // 2. 获取 K 线数据（并行）
      const klinePromises = cryptoList.value.map(async (crypto: CryptoMarketData) => {
        try {
          const symbol = getBinanceSymbol(crypto.symbol)
          const klineUrl = `${baseUrl}/api/market/klines?symbol=${symbol}&interval=1m&limit=50`
          const res = await fetch(klineUrl)

          if (!res.ok) {
            console.warn(`K线数据获取失败: ${crypto.symbol}`)
            return
          }

          const data: BinanceKlineData[] = await res.json()

          if (Array.isArray(data) && data.length > 0) {
            // Binance K线格式: [时间, 开盘价, 最高价, 最低价, 收盘价, 成交量, ...]
            const prices = data.map((k: BinanceKlineData) => parseFloat(k[4]))
            crypto.chartData = prices
          }
        } catch (err) {
          const error = err as Error
          console.warn(`获取 ${crypto.symbol} K线数据失败:`, error.message)
        }
      })

      await Promise.all(klinePromises)
      
      console.log('✅ 市场数据更新成功')

    } catch (err) {
      const errorObj = err as Error
      console.error('❌ 获取市场数据失败:', errorObj)
      error.value = errorObj.message
    } finally {
      loading.value = false
    }
  }

  /**
   * 开始自动更新
   * @param interval - 更新间隔（毫秒），默认5分钟
   */
  const startAutoUpdate = (interval: number = 300000): void => {
    fetchMarketData()
    timer = window.setInterval(fetchMarketData, interval)
  }

  /**
   * 停止自动更新
   */
  const stopAutoUpdate = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /**
   * 生命周期钩子
   */
  onMounted(() => {
    startAutoUpdate()
  })

  onUnmounted(() => {
    stopAutoUpdate()
  })

  return {
    cryptoList,
    loading,
    error,
    fetchMarketData,
    startAutoUpdate,
    stopAutoUpdate
  }
}
