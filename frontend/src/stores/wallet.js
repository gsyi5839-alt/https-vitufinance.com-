/**
 * 钱包状态管理 Store
 * 
 * 功能：
 * - 管理钱包连接状态
 * - 存储钱包地址和短ID
 * - 管理钱包余额（USDT、WLD等）
 * - 支持 TokenPocket、MetaMask 等 DApp 钱包
 * - 自动检测和连接钱包
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWalletStore = defineStore('wallet', () => {
  // ==================== 状态定义 ====================
  
  // 钱包连接状态
  const isConnected = ref(false)
  
  // 完整钱包地址
  const walletAddress = ref('')
  
  // 钱包短ID（显示用，如 1f94a213）
  const walletShortId = ref('')
  
  // 连接中状态
  const isConnecting = ref(false)
  
  // 错误信息
  const errorMessage = ref('')
  
  // 钱包类型（TokenPocket、MetaMask 等）
  const walletType = ref('')

  // ==================== 余额相关状态 ====================
  
  // USDT 余额
  const usdtBalance = ref('0.0000')
  
  // WLD 余额
  const wldBalance = ref('0.0000')
  
  // 总权益价值（USDT）
  const equityValue = ref('0.0000')
  
  // 今日盈亏
  const todayPnl = ref('0.00')
  
  // 余额加载状态
  const isLoadingBalance = ref(false)

  // ==================== 计算属性 ====================
  
  /**
   * 格式化显示的钱包ID
   * 格式：ID: xxxxxxxx
   */
  const displayWalletId = computed(() => {
    if (walletShortId.value) {
      return `ID: ${walletShortId.value}`
    }
    return ''
  })

  /**
   * 截取钱包地址的短ID
   * 取地址最后8位小写字符
   */
  const generateShortId = (address) => {
    if (!address) return ''
    // 取地址最后8位，转为小写
    return address.slice(-8).toLowerCase()
  }

  // ==================== 动作方法 ====================

  /**
   * 设置钱包连接状态
   * @param {string} address - 钱包地址
   * @param {string} type - 钱包类型
   */
  const setWallet = (address, type = 'Unknown') => {
    walletAddress.value = address
    walletShortId.value = generateShortId(address)
    walletType.value = type
    isConnected.value = true
    isConnecting.value = false
    errorMessage.value = ''
    
    // 保存到 localStorage
    localStorage.setItem('walletAddress', address)
    localStorage.setItem('walletType', type)
    
    console.log('[Wallet] Connected:', {
      address,
      shortId: walletShortId.value,
      type
    })
  }

  /**
   * 断开钱包连接
   */
  const disconnect = () => {
    walletAddress.value = ''
    walletShortId.value = ''
    walletType.value = ''
    isConnected.value = false
    isConnecting.value = false
    errorMessage.value = ''
    
    // 重置余额
    usdtBalance.value = '0.0000'
    wldBalance.value = '0.0000'
    equityValue.value = '0.0000'
    todayPnl.value = '0.00'
    isLoadingBalance.value = false
    
    // 清除 localStorage
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletType')
    
    console.log('[Wallet] Disconnected')
  }

  /**
   * 设置连接中状态
   */
  const setConnecting = (status) => {
    isConnecting.value = status
  }

  /**
   * 设置错误信息
   */
  const setError = (message) => {
    errorMessage.value = message
    isConnecting.value = false
  }

  /**
   * 从 localStorage 恢复钱包状态
   * 用于页面刷新后恢复连接状态
   */
  const restoreFromStorage = () => {
    const savedAddress = localStorage.getItem('walletAddress')
    const savedType = localStorage.getItem('walletType')
    
    if (savedAddress) {
      walletAddress.value = savedAddress
      walletShortId.value = generateShortId(savedAddress)
      walletType.value = savedType || 'Unknown'
      isConnected.value = true
      
      console.log('[Wallet] Restored from storage:', {
        address: savedAddress,
        shortId: walletShortId.value,
        type: savedType
      })
    }
  }

  // ==================== 余额相关方法 ====================

  /**
   * 设置 USDT 余额
   * @param {string} balance - USDT 余额
   */
  const setUsdtBalance = (balance) => {
    usdtBalance.value = formatBalance(balance)
  }

  /**
   * 设置 WLD 余额
   * @param {string} balance - WLD 余额
   */
  const setWldBalance = (balance) => {
    wldBalance.value = formatBalance(balance)
  }

  /**
   * 设置总权益价值
   * @param {string} value - 总权益价值（USDT）
   */
  const setEquityValue = (value) => {
    equityValue.value = formatBalance(value)
  }

  /**
   * 设置今日盈亏
   * @param {string} pnl - 今日盈亏
   */
  const setTodayPnl = (pnl) => {
    todayPnl.value = pnl
  }

  /**
   * 设置余额加载状态
   * @param {boolean} status - 是否加载中
   */
  const setLoadingBalance = (status) => {
    isLoadingBalance.value = status
  }

  /**
   * 格式化余额显示
   * @param {string|number} balance - 余额
   * @returns {string} 格式化后的余额
   */
  const formatBalance = (balance) => {
    const num = parseFloat(balance) || 0
    
    // 对于超大数字使用缩写显示
    if (num >= 1000000000000) {
      // 万亿级别 (T)
      return (num / 1000000000000).toFixed(2) + 'T'
    } else if (num >= 1000000000) {
      // 十亿级别 (B)
      return (num / 1000000000).toFixed(2) + 'B'
    } else if (num >= 1000000) {
      // 百万级别 (M)
      return (num / 1000000).toFixed(2) + 'M'
    } else if (num >= 100000) {
      // 十万级别 (K)
      return (num / 1000).toFixed(2) + 'K'
    }
    
    // 正常数字显示4位小数
    return num.toFixed(4)
  }

  /**
   * 更新所有余额
   * @param {object} balances - 余额对象
   */
  const updateBalances = (balances) => {
    if (balances.usdt !== undefined) {
      usdtBalance.value = formatBalance(balances.usdt)
    }
    if (balances.wld !== undefined) {
      wldBalance.value = formatBalance(balances.wld)
    }
    if (balances.equity !== undefined) {
      equityValue.value = formatBalance(balances.equity)
    }
    if (balances.pnl !== undefined) {
      todayPnl.value = balances.pnl
    }
    
    console.log('[Wallet] Balances updated:', {
      usdt: usdtBalance.value,
      wld: wldBalance.value,
      equity: equityValue.value,
      pnl: todayPnl.value
    })
  }

  /**
   * 重置余额（断开连接时调用）
   */
  const resetBalances = () => {
    usdtBalance.value = '0.0000'
    wldBalance.value = '0.0000'
    equityValue.value = '0.0000'
    todayPnl.value = '0.00'
    isLoadingBalance.value = false
  }

  // ==================== 返回 ====================
  
  return {
    // 状态
    isConnected,
    walletAddress,
    walletShortId,
    isConnecting,
    errorMessage,
    walletType,
    
    // 余额状态
    usdtBalance,
    wldBalance,
    equityValue,
    todayPnl,
    isLoadingBalance,
    
    // 计算属性
    displayWalletId,
    
    // 方法
    setWallet,
    disconnect,
    setConnecting,
    setError,
    restoreFromStorage,
    generateShortId,
    
    // 余额方法
    setUsdtBalance,
    setWldBalance,
    setEquityValue,
    setTodayPnl,
    setLoadingBalance,
    updateBalances,
    resetBalances,
    formatBalance
  }
})

