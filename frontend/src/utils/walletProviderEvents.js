/**
 * Wallet provider event and fallback sync helpers.
 *
 * Some wallet extensions expose window.ethereum.request but do not expose the
 * full EIP-1193 event API. In that case we keep the UI fresh by polling
 * eth_accounts while the page is visible.
 */

import { useWalletStore } from '@/stores/wallet'

const AUTH_STORAGE_KEYS = [
  'wallet_auth_token',
  'wallet_auth_token_exp',
  'wallet_auth_wallet'
]

let isInitializing = true
let initializationTimeout = null
let fallbackSyncInterval = null
let fallbackSyncStarted = false
let fallbackFocusHandler = null
let fallbackVisibilityHandler = null
let listenersProvider = null

const clearWalletAuthCache = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

const providerSupportsEvents = (ethereum) => {
  return typeof ethereum?.on === 'function'
}

const disconnectForMissingAccount = (walletStore, options = {}) => {
  const {
    clearBalances = true,
    clearPersistedBalances = true
  } = options

  clearWalletAuthCache()
  walletStore.disconnect({
    clearBalances,
    clearPersistedBalances,
    clearWalletSession: true
  })
}

const setAccountInStore = (account, detectWalletType) => {
  const walletStore = useWalletStore()
  const walletType = detectWalletType()
  const nextAccount = String(account || '')
  const prevAccount = (walletStore.walletAddress || '').toLowerCase()

  if (nextAccount && nextAccount.toLowerCase() !== prevAccount) {
    clearWalletAuthCache()
  }

  walletStore.setWallet(nextAccount, walletType)
  return true
}

const handleMissingAccounts = async ({ getCurrentAccount }) => {
  const walletStore = useWalletStore()

  if (isInitializing) {
    console.log('[Wallet] Ignoring empty accounts during initialization')
    return
  }

  const savedAddress = localStorage.getItem('walletAddress')
  if (savedAddress) {
    console.log('[Wallet] Empty accounts but have saved address, waiting...')
    setTimeout(async () => {
      const currentAccount = await getCurrentAccount()
      if (!currentAccount) {
        console.log('[Wallet] No reconnection, disconnecting')
        disconnectForMissingAccount(walletStore, {
          clearBalances: false,
          clearPersistedBalances: false
        })
      }
    }, 2000)
    return
  }

  disconnectForMissingAccount(walletStore)
}

export const beginWalletInitialization = () => {
  isInitializing = true

  if (initializationTimeout) {
    clearTimeout(initializationTimeout)
    initializationTimeout = null
  }
}

export const finishWalletInitializationSoon = () => {
  initializationTimeout = setTimeout(() => {
    isInitializing = false
    console.log('[Wallet] Initialization protection disabled')
  }, 3000)
}

export const syncWalletAccountState = async (deps, options = {}) => {
  const { isDAppBrowser, getCurrentAccount, detectWalletType } = deps
  const { clearMissingSession = false } = options

  if (!isDAppBrowser()) {
    return false
  }

  const currentAccount = await getCurrentAccount()
  if (currentAccount) {
    return setAccountInStore(currentAccount, detectWalletType)
  }

  if (clearMissingSession) {
    await handleMissingAccounts({ getCurrentAccount })
  }

  return false
}

const setupFallbackWalletSync = (deps) => {
  if (fallbackSyncStarted || typeof window === 'undefined') {
    return
  }

  fallbackSyncStarted = true

  const sync = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      return
    }

    syncWalletAccountState(deps, { clearMissingSession: true }).catch((error) => {
      console.warn('[Wallet] Fallback account sync failed:', error?.message || error)
    })
  }

  fallbackFocusHandler = sync
  window.addEventListener('focus', fallbackFocusHandler)

  if (typeof document !== 'undefined') {
    fallbackVisibilityHandler = () => {
      if (!document.hidden) sync()
    }
    document.addEventListener('visibilitychange', fallbackVisibilityHandler)
  }

  fallbackSyncInterval = setInterval(sync, 2000)
  sync()
}

export const setupWalletProviderListeners = (deps) => {
  const { isDAppBrowser, getCurrentAccount, detectWalletType } = deps

  if (!isDAppBrowser()) {
    return false
  }

  const ethereum = window.ethereum
  if (!providerSupportsEvents(ethereum)) {
    console.warn('[Wallet] Provider event API unavailable, using account polling fallback')
    setupFallbackWalletSync(deps)
    return false
  }

  if (listenersProvider === ethereum) {
    return true
  }

  try {
    ethereum.on('accountsChanged', (accounts) => {
      console.log('[Wallet] Accounts changed:', accounts, 'isInitializing:', isInitializing)

      if (accounts && accounts.length > 0) {
        setAccountInStore(accounts[0], detectWalletType)
        return
      }

      handleMissingAccounts({ getCurrentAccount })
    })

    ethereum.on('chainChanged', (chainId) => {
      console.log('[Wallet] Chain changed:', chainId)
    })

    ethereum.on('disconnect', (error) => {
      console.log('[Wallet] Disconnect event:', error, 'isInitializing:', isInitializing)

      if (isInitializing) {
        console.log('[Wallet] Ignoring disconnect during initialization')
        return
      }

      handleMissingAccounts({ getCurrentAccount })
    })

    listenersProvider = ethereum
    return true
  } catch (error) {
    console.warn('[Wallet] Failed to attach provider events, using account polling fallback:', error?.message || error)
    setupFallbackWalletSync(deps)
    return false
  }
}

export const stopFallbackWalletSync = () => {
  if (fallbackSyncInterval) {
    clearInterval(fallbackSyncInterval)
    fallbackSyncInterval = null
  }

  if (fallbackFocusHandler && typeof window !== 'undefined') {
    window.removeEventListener('focus', fallbackFocusHandler)
    fallbackFocusHandler = null
  }

  if (fallbackVisibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', fallbackVisibilityHandler)
    fallbackVisibilityHandler = null
  }

  fallbackSyncStarted = false
}
