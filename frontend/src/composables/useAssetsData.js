/**
 * Assets页面数据管理 Composable
 * 
 * 功能:
 * - 管理余额数据
 * - 管理交易记录
 * - 管理刷新逻辑
 * - 优化API请求(防抖、缓存)
 */

import { ref, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'

// 请求缓存
const requestCache = new Map()
const CACHE_DURATION = 30000 // 30秒缓存

/**
 * 带缓存的fetch请求
 * @param {string} url - 请求URL
 * @param {number} cacheDuration - 缓存时长(毫秒)
 * @returns {Promise<any>} 响应数据
 */
async function cachedFetch(url, cacheDuration = CACHE_DURATION) {
  const now = Date.now()
  const cached = requestCache.get(url)
  
  // 如果有缓存且未过期,直接返回
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log('[Cache] Hit:', url)
    return cached.data
  }
  
  // 发起新请求
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    // 存入缓存
    requestCache.set(url, {
      data,
      timestamp: now
    })
    
    return data
  } catch (error) {
    console.error('[Fetch] Error:', url, error)
    throw error
  }
}

/**
 * 清除指定URL的缓存
 * @param {string} url - 要清除的URL,不传则清除所有
 */
export function clearCache(url = null) {
  if (url) {
    requestCache.delete(url)
  } else {
    requestCache.clear()
  }
}

export function useAssetsData() {
  const walletStore = useWalletStore()
  
  // ==================== 状态定义 ====================
  const wldPrice = ref(0)
  const exchangeWldPrice = ref(0)
  const userLevel = ref(0)
  const dailyRedeemableWld = ref(0)
  const todayExchangedWld = ref(0)
  const todayEarnings = ref(0)
  const totalReferralReward = ref('0.0000')
  const totalTeamReward = ref('0.0000')
  
  // 记录数据
  const checkinRecords = ref([])
  const depositRecords = ref([])
  const withdrawRecords = ref([])
  const quantifyRecords = ref([])
  const referralRecords = ref([])
  const teamRewards = ref([])
  
  // 保险箱状态
  const safeStatus = ref({
    has_safe: false,
    locked_usdt: '0.0000',
    locked_wld: '0.0000'
  })
  
  // 加载状态
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  
  // ==================== 计算属性 ====================
  
  /**
   * 合并所有USDT记录并按时间排序
   */
  const allUsdtRecords = computed(() => {
    const records = []
    
    // 添加各类记录
    depositRecords.value.forEach(record => {
      records.push({ ...record, type: 'deposit', timestamp: new Date(record.created_at).getTime() })
    })
    
    withdrawRecords.value.forEach(record => {
      records.push({ ...record, type: 'withdraw', timestamp: new Date(record.created_at).getTime() })
    })
    
    quantifyRecords.value.forEach(record => {
      records.push({ ...record, type: 'quantify', timestamp: new Date(record.created_at).getTime() })
    })
    
    referralRecords.value.forEach(record => {
      records.push({ ...record, type: 'referral', timestamp: new Date(record.created_at).getTime() })
    })
    
    teamRewards.value.forEach(record => {
      records.push({ ...record, type: 'team_reward', timestamp: new Date(record.created_at).getTime() })
    })
    
    // 按时间倒序排序
    return records.sort((a, b) => b.timestamp - a.timestamp)
  })
  
  /**
   * 格式化今日收益显示
   */
  const formatTodayEarnings = computed(() => {
    const earnings = parseFloat(todayEarnings.value) || 0
    return earnings > 0 ? '+' + earnings.toFixed(2) : earnings.toFixed(2)
  })
  
  // ==================== API请求方法 ====================
  
  /**
   * 获取WLD价格(带缓存)
   */
  async function fetchWldPrice() {
    try {
      const data = await cachedFetch('/api/market/ticker?symbols=["WLDUSDT"]', 60000) // 1分钟缓存
      
      if (Array.isArray(data) && data.length > 0) {
        wldPrice.value = parseFloat(data[0].lastPrice) || 0
        exchangeWldPrice.value = wldPrice.value
      } else if (data.success && data.data && data.data.length > 0) {
        wldPrice.value = parseFloat(data.data[0].lastPrice) || 0
        exchangeWldPrice.value = wldPrice.value
      }
    } catch (error) {
      console.error('[Assets] 获取WLD价格失败:', error)
    }
  }
  
  /**
   * 获取用户经纪人等级和每日可兑换额度
   */
  async function fetchUserLevel() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/invite/stats?wallet_address=${walletStore.walletAddress}`,
        60000 // 1分钟缓存
      )
      
      if (data.success && data.data) {
        userLevel.value = data.data.broker_level || 0
        dailyRedeemableWld.value = data.data.daily_redeemable_wld || 0
      }
    } catch (error) {
      console.error('[Assets] 获取用户等级失败:', error)
    }
  }
  
  /**
   * 获取今日已兑换WLD数量
   */
  async function fetchTodayExchanged() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/exchange/today-exchanged?wallet_address=${walletStore.walletAddress}`,
        30000 // 30秒缓存
      )
      
      if (data.success) {
        todayExchangedWld.value = parseFloat(data.data.today_exchanged) || 0
      }
    } catch (error) {
      console.error('[Assets] 获取今日兑换数量失败:', error)
    }
  }
  
  /**
   * 获取签到记录
   */
  async function fetchCheckinRecords() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/checkin/records?wallet=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success && Array.isArray(data.data)) {
        checkinRecords.value = data.data
      }
    } catch (error) {
      console.error('[Assets] 获取签到记录失败:', error)
    }
  }
  
  /**
   * 获取充值记录
   */
  async function fetchDepositRecords() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/deposit/records?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success && Array.isArray(data.data)) {
        depositRecords.value = data.data
      }
    } catch (error) {
      console.error('[Assets] 获取充值记录失败:', error)
    }
  }
  
  /**
   * 获取提现记录
   */
  async function fetchWithdrawRecords() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/withdraw/records?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success && Array.isArray(data.data)) {
        withdrawRecords.value = data.data
      }
    } catch (error) {
      console.error('[Assets] 获取提现记录失败:', error)
    }
  }
  
  /**
   * 获取量化收益记录和今日收益
   */
  async function fetchQuantifyRecords() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/quantify/records?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success) {
        if (Array.isArray(data.data.records)) {
          quantifyRecords.value = data.data.records
        }
        if (data.data.today_earnings !== undefined) {
          todayEarnings.value = parseFloat(data.data.today_earnings) || 0
        }
      }
    } catch (error) {
      console.error('[Assets] 获取量化收益记录失败:', error)
    }
  }
  
  /**
   * 获取推荐奖励记录
   */
  async function fetchReferralRecords() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/invite/rewards?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success) {
        if (Array.isArray(data.data.records)) {
          referralRecords.value = data.data.records
        }
        if (data.data.total_reward !== undefined) {
          totalReferralReward.value = parseFloat(data.data.total_reward).toFixed(4)
        }
      }
    } catch (error) {
      console.error('[Assets] 获取推荐奖励记录失败:', error)
    }
  }
  
  /**
   * 获取团队奖励记录
   */
  async function fetchTeamRewards() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/team/rewards?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success) {
        if (Array.isArray(data.data.records)) {
          teamRewards.value = data.data.records
        }
        if (data.data.total_reward !== undefined) {
          totalTeamReward.value = parseFloat(data.data.total_reward).toFixed(4)
        }
      }
    } catch (error) {
      console.error('[Assets] 获取团队奖励记录失败:', error)
    }
  }
  
  /**
   * 获取保险箱状态
   */
  async function fetchSafeStatus() {
    if (!walletStore.isConnected || !walletStore.walletAddress) return
    
    try {
      const data = await cachedFetch(
        `/api/safe/status?wallet_address=${walletStore.walletAddress}`,
        30000
      )
      
      if (data.success && data.data) {
        safeStatus.value = {
          has_safe: data.data.has_safe || false,
          locked_usdt: data.data.locked_usdt || '0.0000',
          locked_wld: data.data.locked_wld || '0.0000'
        }
      }
    } catch (error) {
      console.error('[Assets] 获取保险箱状态失败:', error)
    }
  }
  
  /**
   * 刷新所有数据(并行请求)
   */
  async function refreshAllData() {
    if (isRefreshing.value) return
    
    isRefreshing.value = true
    console.log('[Assets] 刷新所有数据...')
    
    try {
      // 并行请求所有数据
      await Promise.all([
        fetchWldPrice(),
        fetchUserLevel(),
        fetchTodayExchanged(),
        fetchCheckinRecords(),
        fetchDepositRecords(),
        fetchWithdrawRecords(),
        fetchQuantifyRecords(),
        fetchReferralRecords(),
        fetchTeamRewards(),
        fetchSafeStatus()
      ])
      
      console.log('[Assets] 数据刷新完成')
    } catch (error) {
      console.error('[Assets] 数据刷新失败:', error)
    } finally {
      isRefreshing.value = false
    }
  }
  
  /**
   * 初始化数据(首次加载)
   */
  async function initializeData() {
    if (isLoading.value) return
    
    isLoading.value = true
    
    try {
      await refreshAllData()
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 强制刷新(清除缓存)
   */
  async function forceRefresh() {
    clearCache()
    await refreshAllData()
  }
  
  // ==================== 返回 ====================
  return {
    // 状态
    wldPrice,
    exchangeWldPrice,
    userLevel,
    dailyRedeemableWld,
    todayExchangedWld,
    todayEarnings,
    totalReferralReward,
    totalTeamReward,
    checkinRecords,
    depositRecords,
    withdrawRecords,
    quantifyRecords,
    referralRecords,
    teamRewards,
    safeStatus,
    isLoading,
    isRefreshing,
    
    // 计算属性
    allUsdtRecords,
    formatTodayEarnings,
    
    // 方法
    fetchWldPrice,
    fetchUserLevel,
    fetchTodayExchanged,
    fetchCheckinRecords,
    fetchDepositRecords,
    fetchWithdrawRecords,
    fetchQuantifyRecords,
    fetchReferralRecords,
    fetchTeamRewards,
    fetchSafeStatus,
    refreshAllData,
    initializeData,
    forceRefresh
  }
}

