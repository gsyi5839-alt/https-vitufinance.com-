/**
 * Wallet and token balance helpers.
 */

import { useWalletStore } from '@/stores/wallet'

const hasWalletProvider = () => {
  return typeof window !== 'undefined' && !!window.ethereum
}

/**
 * ERC20 token contracts by chain.
 */
const TOKEN_CONTRACTS = {
  // BSC Mainnet
  '0x38': {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    WLD: '0x0000000000000000000000000000000000000000'
  },
  // Ethereum Mainnet
  '0x1': {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    WLD: '0x163f8C2467924be0ae7B5347228CABF260318753'
  },
  // Polygon
  '0x89': {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    WLD: '0x0000000000000000000000000000000000000000'
  }
}

export const getWalletBalance = async (address) => {
  if (!hasWalletProvider() || !address) {
    return '0'
  }

  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    })

    const ethBalance = parseInt(balance, 16) / 1e18
    return ethBalance.toFixed(4)
  } catch (error) {
    console.error('[Wallet] Get balance error:', error)
    return '0'
  }
}

export const getNetworkInfo = async () => {
  if (!hasWalletProvider()) {
    return { chainId: '', networkName: 'Unknown' }
  }

  try {
    const chainId = await window.ethereum.request({
      method: 'eth_chainId'
    })

    const networkNames = {
      '0x1': 'Ethereum Mainnet',
      '0x38': 'BSC Mainnet',
      '0x89': 'Polygon Mainnet',
      '0xa86a': 'Avalanche C-Chain',
      '0xa4b1': 'Arbitrum One',
      '0xa': 'Optimism',
      '0x5': 'Goerli Testnet',
      '0xaa36a7': 'Sepolia Testnet'
    }

    return {
      chainId,
      networkName: networkNames[chainId] || `Chain ID: ${parseInt(chainId, 16)}`
    }
  } catch (error) {
    console.error('[Wallet] Get network error:', error)
    return { chainId: '', networkName: 'Unknown' }
  }
}

export const getTokenBalance = async (address, tokenContract, decimals = 18) => {
  if (!hasWalletProvider() || !address || !tokenContract) {
    return '0'
  }

  try {
    const data = '0x70a08231' + address.slice(2).padStart(64, '0')
    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: tokenContract,
          data
        },
        'latest'
      ]
    })

    const balance = parseInt(result, 16) / Math.pow(10, decimals)
    return balance.toFixed(4)
  } catch (error) {
    console.error('[Wallet] Get token balance error:', error)
    return '0'
  }
}

export const getUsdtBalance = async (address) => {
  if (!hasWalletProvider() || !address) {
    return '0.0000'
  }

  try {
    const { chainId } = await getNetworkInfo()
    const contracts = TOKEN_CONTRACTS[chainId]

    if (!contracts?.USDT) {
      console.log('[Wallet] USDT contract not found for chain:', chainId)
      return '0.0000'
    }

    const decimals = chainId === '0x1' ? 6 : 18
    return await getTokenBalance(address, contracts.USDT, decimals)
  } catch (error) {
    console.error('[Wallet] Get USDT balance error:', error)
    return '0.0000'
  }
}

export const getWldBalance = async (address) => {
  if (!hasWalletProvider() || !address) {
    return '0.0000'
  }

  try {
    const { chainId } = await getNetworkInfo()
    const contracts = TOKEN_CONTRACTS[chainId]

    if (!contracts?.WLD || contracts.WLD === '0x0000000000000000000000000000000000000000') {
      console.log('[Wallet] WLD contract not found for chain:', chainId)
      return '0.0000'
    }

    return await getTokenBalance(address, contracts.WLD, 18)
  } catch (error) {
    console.error('[Wallet] Get WLD balance error:', error)
    return '0.0000'
  }
}

export const getAllBalances = async (address) => {
  const walletStore = useWalletStore()
  walletStore.setLoadingBalance(true)

  try {
    const [usdt, wld] = await Promise.all([
      getUsdtBalance(address),
      getWldBalance(address)
    ])

    const usdtNum = parseFloat(usdt) || 0
    const equity = usdtNum.toFixed(4)

    walletStore.updateBalances({
      usdt,
      wld,
      equity,
      pnl: '+0.00'
    })

    console.log('[Wallet] All balances fetched:', { usdt, wld, equity })
    return { usdt, wld, equity }
  } catch (error) {
    console.error('[Wallet] Get all balances error:', error)
    return { usdt: '0.0000', wld: '0.0000', equity: '0.0000' }
  } finally {
    walletStore.setLoadingBalance(false)
  }
}

export const refreshBalances = async () => {
  const walletStore = useWalletStore()

  if (!walletStore.isConnected || !walletStore.walletAddress) {
    console.log('[Wallet] Cannot refresh balances: wallet not connected')
    return
  }

  return await getAllBalances(walletStore.walletAddress)
}
