const DEFAULT_PAYMENT_WALLET_CONFIGS = {
  BSC: {
    address: '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4',
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    token: 'USDT',
    tokenContract: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    tokens: {
      USDT: {
        tokenContract: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18
      }
    },
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    explorer: 'https://bscscan.com/'
  },
  ETH: {
    address: '0x8a92c73FdE5d0313303989eB269d6d17ffb1ba9d',
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    token: 'USDT',
    tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    tokens: {
      USDT: {
        tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6
      },
      USDC: {
        tokenContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6
      }
    },
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io/'
  }
}

export function createDefaultPaymentWalletConfigs() {
  return JSON.parse(JSON.stringify(DEFAULT_PAYMENT_WALLET_CONFIGS))
}

export function chainSupportsPaymentToken(walletConfigs, chain, token) {
  const chainConfig = walletConfigs[chain]
  if (!chainConfig) return false
  return Boolean(chainConfig.tokens?.[token] || chainConfig.token === token)
}

export function toTokenUnitsHex(value, decimals) {
  const [whole = '0', fraction = ''] = String(value).trim().split('.')
  const base = 10n ** BigInt(decimals)
  const wholeUnits = BigInt(whole || '0') * base
  const fractionUnits = BigInt(fraction.padEnd(decimals, '0').slice(0, decimals) || '0')
  return (wholeUnits + fractionUnits).toString(16).padStart(64, '0')
}
