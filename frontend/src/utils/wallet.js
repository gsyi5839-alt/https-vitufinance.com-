/**
 * 钱包连接工具函数
 * 
 * 支持的钱包：
 * - TokenPocket（TP 钱包）
 * - MetaMask
 * - imToken
 * - Trust Wallet
 * - 其他支持 EIP-1193 标准的钱包
 * 
 * 使用方式：
 * 用户通过钱包内置浏览器访问 DApp，自动检测并连接钱包
 */

import { useWalletStore } from '@/stores/wallet'
import {
  beginWalletInitialization,
  finishWalletInitializationSoon,
  setupWalletProviderListeners,
  syncWalletAccountState
} from '@/utils/walletProviderEvents'

let connectWalletInFlight = null
export {
  getAllBalances,
  getNetworkInfo,
  getTokenBalance,
  getUsdtBalance,
  getWalletBalance,
  getWldBalance,
  refreshBalances
} from '@/utils/walletBalances'

/**
 * 检测是否在 DApp 浏览器环境中
 * @returns {boolean} 是否在 DApp 浏览器中
 */
export const isDAppBrowser = () => {
  // 检测是否存在 ethereum 对象（EIP-1193 标准）
  if (typeof window !== 'undefined' && window.ethereum) {
    return true
  }
  return false
}

/**
 * 检测钱包类型
 * @returns {string} 钱包类型名称
 */
export const detectWalletType = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.log('[Wallet] detectWalletType: No ethereum object found')
    return 'Unknown'
  }

  const ethereum = window.ethereum
  
  // 调试：显示所有可用的钱包标识
  console.log('[Wallet] detectWalletType - Available wallet flags:', {
    isTokenPocket: ethereum.isTokenPocket,
    isMetaMask: ethereum.isMetaMask,
    isImToken: ethereum.isImToken,
    isTrust: ethereum.isTrust,
    isCoinbaseWallet: ethereum.isCoinbaseWallet,
    isOkxWallet: ethereum.isOkxWallet,
    isOKExWallet: ethereum.isOKExWallet,
    isBitKeep: ethereum.isBitKeep
  })

  // 检测 TokenPocket
  if (ethereum.isTokenPocket) {
    console.log('[Wallet] ✅ Detected: TokenPocket')
    return 'TokenPocket'
  }

  // 检测 MetaMask
  if (ethereum.isMetaMask) {
    console.log('[Wallet] ✅ Detected: MetaMask')
    return 'MetaMask'
  }

  // 检测 imToken
  if (ethereum.isImToken) {
    console.log('[Wallet] ✅ Detected: imToken')
    return 'imToken'
  }

  // 检测 Trust Wallet
  if (ethereum.isTrust) {
    console.log('[Wallet] ✅ Detected: Trust Wallet')
    return 'Trust Wallet'
  }

  // 检测 Coinbase Wallet
  if (ethereum.isCoinbaseWallet) {
    console.log('[Wallet] ✅ Detected: Coinbase Wallet')
    return 'Coinbase Wallet'
  }

  // 检测 OKX Wallet
  if (ethereum.isOkxWallet || ethereum.isOKExWallet) {
    console.log('[Wallet] ✅ Detected: OKX Wallet')
    return 'OKX Wallet'
  }

  // 检测 Bitget Wallet
  if (ethereum.isBitKeep) {
    console.log('[Wallet] ✅ Detected: Bitget Wallet')
    return 'Bitget Wallet'
  }

  console.log('[Wallet] ⚠️ Detected: Unknown Wallet')
  return 'Unknown Wallet'
}

/**
 * 连接钱包
 * @returns {Promise<{success: boolean, address?: string, error?: string}>}
 */
export const connectWallet = async () => {
  if (connectWalletInFlight) {
    return connectWalletInFlight
  }

  const walletStore = useWalletStore()

  connectWalletInFlight = (async () => {
    // 检查是否在 DApp 浏览器中
    if (!isDAppBrowser()) {
      return {
        success: false,
        error: 'Please open in wallet browser (TokenPocket, MetaMask, etc.)'
      }
    }

    try {
      walletStore.setConnecting(true)

      const ethereum = window.ethereum
      const walletType = detectWalletType()

      console.log('[Wallet] Detected wallet type:', walletType)

      // 请求用户授权连接钱包
      // 使用 eth_requestAccounts 方法请求连接
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        walletStore.setWallet(address, walletType)

        return {
          success: true,
          address: address,
          walletType: walletType
        }
      }

      walletStore.setError('No accounts found')
      return {
        success: false,
        error: 'No accounts found'
      }
    } catch (error) {
      console.error('[Wallet] Connection error:', error)

      let errorMessage = 'Connection failed'
      let pending = false

      // 处理用户拒绝连接的情况
      if (error.code === 4001) {
        errorMessage = 'User rejected the connection request'
      } else if (error.code === -32002) {
        pending = true
        errorMessage = 'Connection request pending, please check your wallet'

        // Some extension wallets report -32002 while the account was already
        // authorized in another popup. Re-read accounts before surfacing an error.
        await new Promise(resolve => setTimeout(resolve, 800))
        const currentAccount = await getCurrentAccount()
        if (currentAccount) {
          const walletType = detectWalletType()
          walletStore.setWallet(currentAccount, walletType)
          return {
            success: true,
            address: currentAccount,
            walletType,
            recoveredFromPending: true
          }
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      walletStore.setError(errorMessage)

      return {
        success: false,
        error: errorMessage,
        pending
      }
    }
  })().finally(() => {
    connectWalletInFlight = null
  })

  return connectWalletInFlight
}

/**
 * 断开钱包连接
 */
export const disconnectWallet = () => {
  const walletStore = useWalletStore()
  // User-initiated disconnect: clear wallet session + balances
  walletStore.disconnect({
    clearBalances: true,
    clearPersistedBalances: true,
    clearWalletSession: true
  })
}

/**
 * 获取当前连接的账户
 * @returns {Promise<string|null>} 钱包地址或 null
 */
export const getCurrentAccount = async () => {
  if (!isDAppBrowser()) {
    return null
  }

  try {
    const ethereum = window.ethereum
    const accounts = await ethereum.request({
      method: 'eth_accounts'
    })

    if (accounts && accounts.length > 0) {
      return accounts[0]
    }
    return null
  } catch (error) {
    console.error('[Wallet] Get accounts error:', error)
    return null
  }
}

/**
 * 自动连接钱包（如果用户之前已授权）
 * 用于页面加载时自动恢复连接状态
 */
export const autoConnectWallet = async () => {
  const walletStore = useWalletStore()

  // 首先尝试从 localStorage 恢复
  walletStore.restoreFromStorage()

  // 如果在 DApp 浏览器中，检查是否已授权
  if (isDAppBrowser()) {
    try {
      const currentAccount = await getCurrentAccount()
      const walletType = detectWalletType()

      if (currentAccount) {
        // 如果有已授权的账户，更新状态
        walletStore.setWallet(currentAccount, walletType)
        console.log('[Wallet] Auto-connected:', currentAccount)
        return true
      }
    } catch (error) {
      console.error('[Wallet] Auto-connect error:', error)
    }
  }

  return walletStore.isConnected
}

/**
 * 初始化钱包连接
 * 在应用启动时调用
 * 
 * Uses initialization protection to prevent false disconnects
 * during page refresh when wallets may briefly return empty accounts
 */
export const initWallet = async () => {
  console.log('[Wallet] Initializing...')

  beginWalletInitialization()

  const walletDeps = {
    isDAppBrowser,
    getCurrentAccount,
    detectWalletType
  }

  // 设置监听器；不支持 ethereum.on 的钱包会自动启用 eth_accounts 轮询兜底
  setupWalletProviderListeners(walletDeps)

  // 尝试自动连接
  const connected = await autoConnectWallet()
  await syncWalletAccountState(walletDeps)

  console.log('[Wallet] Initialization complete, connected:', connected)

  finishWalletInitializationSoon()

  return connected || useWalletStore().isConnected
}

/**
 * 确保推荐关系已绑定
 * 在购买、量化等关键操作前调用，确保推荐关系不会遗漏
 * @returns {Promise<boolean>} 是否成功绑定或已绑定
 */
export const ensureReferralBound = async () => {
  const walletStore = useWalletStore()
  
  if (!walletStore.isConnected || !walletStore.walletAddress) {
    return false
  }
  
  // 获取保存的推荐码
  const refCode = localStorage.getItem('vitu_referral_code')
  if (!refCode) {
    return true // 没有推荐码，无需绑定
  }
  
  // 不能邀请自己
  if (refCode.toLowerCase() === walletStore.walletAddress.slice(-8).toLowerCase()) {
    localStorage.removeItem('vitu_referral_code')
    return true
  }
  
  try {
    console.log('[Wallet] Ensuring referral bound, code:', refCode)
    const response = await fetch('/api/invite/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        referrer_code: refCode
      })
    })
    
    const data = await response.json()
    if (data.success) {
      console.log('[Wallet] Referral bound successfully!')
      localStorage.removeItem('vitu_referral_code')
    }
    return true
  } catch (error) {
    console.error('[Wallet] Failed to bind referral:', error)
    return false
  }
}
