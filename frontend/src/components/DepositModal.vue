<template>
  <!-- Deposit Modal -->
  <div v-if="visible" class="deposit-modal-overlay" @click.self="closeModal">
    <div class="deposit-modal">
      <!-- Title -->
      <h2 class="modal-title">{{ t('depositModal.title') }}</h2>
      
      <!-- Scrollable Content Area -->
      <div class="modal-content">
        <!-- Chain Selection Area -->
        <div class="chain-select-section">
          <label class="input-label">{{ t('depositModal.selectNetwork') }}</label>
          <div class="chain-buttons">
            <!-- BSC Selection Button -->
            <button 
              class="chain-btn"
              :class="{ selected: selectedChain === 'BSC' }"
              @click="selectedChain = 'BSC'"
            >
              <img src="/static/bsc-chain.png" alt="BSC" class="chain-logo-img" />
              <div class="chain-info">
                <span class="chain-name">BSC</span>
                <span class="chain-desc">{{ t('depositModal.lowGasFee') }}</span>
              </div>
            </button>
            
            <!-- ETH Selection Button -->
            <button 
              class="chain-btn"
              :class="{ selected: selectedChain === 'ETH' }"
              @click="selectedChain = 'ETH'"
            >
              <img src="/static/eth-chain.png" alt="ETH" class="chain-logo-img" />
              <div class="chain-info">
                <span class="chain-name">Ethereum</span>
                <span class="chain-desc">{{ t('depositModal.mainnet') }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Token Selection Area -->
        <div class="token-select-section">
          <label class="input-label">{{ t('depositModal.selectCurrency') }}</label>
          <div class="token-buttons">
            <button
              v-for="token in paymentTokens"
              :key="token.symbol"
              type="button"
              class="token-btn"
              :class="{ selected: selectedToken === token.symbol }"
              @click="selectToken(token)"
            >
              <img :src="token.icon" :alt="token.symbol" class="token-logo-img" />
              <div class="token-info">
                <span class="token-symbol">{{ token.symbol }}</span>
                <span class="token-name">{{ token.name }}</span>
              </div>
            </button>
          </div>
          <p v-if="tokenUnavailableMessage" class="token-status-text">
            {{ tokenUnavailableMessage }}
          </p>
        </div>
        
        <!-- Input Area -->
        <div class="input-section">
          <label class="input-label">{{ t('depositModal.enterAmount') }}</label>
          <div class="amount-input-wrapper">
            <input 
              v-model="depositAmount" 
              type="number" 
              min="20"
              step="1"
              placeholder="0"
              class="amount-input"
            />
          </div>
        </div>
        
        <!-- Quick Amount Buttons -->
        <div class="quick-amounts">
          <button 
            v-for="amount in quickAmounts" 
            :key="amount"
            class="quick-amount-btn"
            :class="{ selected: depositAmount === amount.toString() }"
            @click="depositAmount = amount.toString()"
          >
            {{ amount }}
          </button>
        </div>
        
        <!-- Tip -->
        <p class="tip-text">{{ minDepositTip }}</p>
      </div><!-- /.modal-content -->

      <!-- Button Area (Fixed at bottom) -->
      <div class="button-group">
        <button class="btn-cancel" @click="closeModal">{{ t('common.cancel') }}</button>
        <button 
          class="btn-sure" 
          :disabled="!isValidAmount || isProcessing"
          @click="handleDeposit"
        >
          {{ isProcessing ? t('common.processing') : t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { post } from '@/api/secureApi'
import { isDAppBrowser, getNetworkInfo } from '@/utils/wallet'
import { paymentTokens } from '@/utils/paymentTokens'
import {
  chainSupportsPaymentToken,
  createDefaultPaymentWalletConfigs,
  toTokenUnitsHex
} from '@/utils/paymentWallets'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 钱包 store
const walletStore = useWalletStore()

// 状态
const depositAmount = ref('')
const isProcessing = ref(false)

// 链选择
const selectedChain = ref('BSC')
const selectedToken = ref('USDT')

// 多链钱包配置
const walletConfigs = ref(createDefaultPaymentWalletConfigs())

// 当前选中链的配置
const currentChainConfig = computed(() => walletConfigs.value[selectedChain.value])

const selectedTokenConfig = computed(() => 
  paymentTokens.find(token => token.symbol === selectedToken.value) || paymentTokens[0]
)

const selectedTokenChainConfig = computed(() => {
  const chainConfig = currentChainConfig.value
  if (!chainConfig) return null

  if (chainConfig.tokens?.[selectedToken.value]) {
    return {
      ...chainConfig,
      ...chainConfig.tokens[selectedToken.value],
      token: selectedToken.value
    }
  }

  return chainConfig.token === selectedToken.value ? chainConfig : null
})

const isSelectedTokenReady = computed(() => 
  Boolean(
    selectedTokenConfig.value?.transferEnabled &&
    selectedTokenChainConfig.value?.address &&
    selectedTokenChainConfig.value?.tokenContract
  )
)

const tokenUnavailableMessage = computed(() => {
  if (isSelectedTokenReady.value) return ''
  return selectedTokenConfig.value?.unavailableMessage || 
    `${selectedToken.value} deposits are not configured for ${selectedChain.value} yet`
})

// 平台收款地址（根据选中链动态获取）
const platformWalletAddress = computed(() => selectedTokenChainConfig.value?.address || '')

// 快捷金额选项
const quickAmounts = [20, 100, 300, 500, 800]

// Token 合约地址（根据选中链和币种动态获取）
const TOKEN_CONTRACT_ADDRESS = computed(() => selectedTokenChainConfig.value?.tokenContract || '')

const withSelectedToken = (message) => {
  if (typeof message !== 'string') return message
  return message.replaceAll('USDT', selectedToken.value)
}

const minDepositTip = computed(() => withSelectedToken(t('depositModal.minDepositTip')))

const amountDecimals = computed(() => selectedTokenChainConfig.value?.decimals ?? 18)

const isDecimalAmountInput = (value) => {
  const amountText = String(value).trim()
  if (!/^\d+(\.\d*)?$/.test(amountText)) return false
  const [, fraction = ''] = amountText.split('.')
  return fraction.length <= amountDecimals.value
}

// 计算属性
const isValidAmount = computed(() => {
  const amount = parseFloat(depositAmount.value)
  return isSelectedTokenReady.value && isDecimalAmountInput(depositAmount.value) && !isNaN(amount) && amount >= 20
})

// 监听弹窗显示状态，重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    fetchPlatformWallet()
  }
})

// 重置表单
const resetForm = () => {
  depositAmount.value = ''
  isProcessing.value = false
  selectedToken.value = 'USDT'
}

const selectToken = (token) => {
  selectedToken.value = token.symbol
  if (chainSupportsPaymentToken(walletConfigs.value, selectedChain.value, token.symbol)) return

  const supportedChain = Object.keys(walletConfigs.value)
    .find(chain => chainSupportsPaymentToken(walletConfigs.value, chain, token.symbol))
  if (supportedChain) {
    selectedChain.value = supportedChain
  }
}

// 获取平台收款地址（多链）
const fetchPlatformWallet = async () => {
  try {
    const response = await fetch('/api/platform/wallet')
    const data = await response.json()
    if (data.success && data.data) {
      // 更新多链钱包配置
      if (data.data.wallets) {
        walletConfigs.value = Object.entries(data.data.wallets).reduce((configs, [chain, walletConfig]) => ({
          ...configs,
          [chain]: {
            ...(configs[chain] || {}),
            ...walletConfig
          }
        }), walletConfigs.value)
      }
      console.log('[Deposit] Wallet configs loaded:', walletConfigs.value)
    }
  } catch (error) {
    console.error('Failed to fetch platform wallet:', error)
  }
}

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}

/**
 * 获取钱包中的当前币种余额（链上余额）
 * 注意：ETH的USDT是6位小数，BSC的USDT是18位小数
 * @returns {Promise<number>} 当前币种余额
 */
const getWalletTokenBalance = async () => {
  try {
    const ethereum = window.ethereum
    if (!ethereum) return 0
    
    const chainConfig = selectedTokenChainConfig.value
    if (!chainConfig?.tokenContract) return 0
    
    // 调用 ERC-20 合约的 balanceOf 方法
    // balanceOf(address) 函数签名: 0x70a08231
    const walletAddr = walletStore.walletAddress.slice(2).padStart(64, '0')
    const data = '0x70a08231' + walletAddr
    
    const result = await ethereum.request({
      method: 'eth_call',
      params: [{
        to: chainConfig.tokenContract,
        data: data
      }, 'latest']
    })
    
    // 将结果从 hex 转换为数字（根据链的小数位数）
    const balanceWei = BigInt(result)
    const decimals = chainConfig.decimals
    const balance = Number(balanceWei) / Math.pow(10, decimals)
    
    console.log(`[Deposit] Wallet ${selectedToken.value} balance on ${selectedChain.value}:`, balance)
    return balance
  } catch (error) {
    console.error(`[Deposit] Failed to get ${selectedToken.value} balance:`, error)
    return 0
  }
}

// 处理充值
const handleDeposit = async () => {
  if (!isSelectedTokenReady.value) {
    alert(tokenUnavailableMessage.value)
    return
  }

  if (!isValidAmount.value) {
    alert(withSelectedToken(t('depositModal.enterValidAmount')))
    return
  }

  if (!isDAppBrowser()) {
    alert(t('depositModal.openInWalletBrowser'))
    return
  }

  if (!walletStore.isConnected) {
    alert(t('depositModal.connectWalletFirst'))
    return
  }

  isProcessing.value = true

  try {
    const ethereum = window.ethereum
    const chainConfig = selectedTokenChainConfig.value
    
    // 检查当前网络是否是选中的链
    const { chainId } = await getNetworkInfo()
    if (chainId !== chainConfig.chainId) {
      // 尝试切换到选中的网络
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainConfig.chainId }]
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          // 网络不存在，尝试添加（仅对BSC等非内置网络）
          if (selectedChain.value === 'BSC') {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainConfig.chainId,
                chainName: chainConfig.chainName,
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: [chainConfig.rpcUrl],
                blockExplorerUrls: [chainConfig.explorer]
              }]
            })
          } else {
            // ETH主网应该已内置，如果没有则提示用户
            alert('Please add Ethereum Mainnet to your wallet manually')
            isProcessing.value = false
            return
          }
        } else {
          throw switchError
        }
      }
    }

    const amount = parseFloat(depositAmount.value)
    
    // ✅ 检查钱包当前币种余额是否足够
    const walletBalance = await getWalletTokenBalance()
    if (walletBalance < amount) {
      // 显示余额不足提示
      const message = t('depositModal.walletInsufficientBalance', { balance: walletBalance.toFixed(4) })
      // 如果翻译返回原始键名，使用后备文本
      const displayMessage = message.includes('depositModal.') 
        ? `Insufficient ${selectedToken.value} in wallet. Current balance: ${walletBalance.toFixed(4)} ${selectedToken.value}`
        : withSelectedToken(message)
      alert(displayMessage)
      isProcessing.value = false
      return
    }

    // 构造 ERC-20 转账数据
    // transfer(address to, uint256 amount)
    // 函数签名: 0xa9059cbb
    // 注意：ETH的USDT是6位小数，BSC的USDT是18位小数
    const decimals = chainConfig.decimals
    const amountWei = toTokenUnitsHex(depositAmount.value, decimals)
    const toAddress = platformWalletAddress.value.slice(2).padStart(64, '0')
    const data = '0xa9059cbb' + toAddress + amountWei

    // 发送交易
    const transactionHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletStore.walletAddress,
        to: TOKEN_CONTRACT_ADDRESS.value,
        data: data,
        gas: selectedChain.value === 'ETH' ? '0x14C08' : '0x186A0' // ETH 85000, BSC 100000
      }]
    })

    console.log('[Deposit] Transaction sent:', transactionHash)

    // 提交充值记录到后端（后端会验证交易状态）
    const submitResult = await submitDepositRecord(transactionHash)
    
    if (!submitResult.success) {
      alert(submitResult.message || t('depositModal.depositFailed'))
      return
    }

    // 触发成功事件
    emit('success', {
      amount: depositAmount.value,
      token: selectedToken.value,
      txHash: transactionHash
    })

    alert(withSelectedToken(t('depositModal.depositSuccess', { amount: depositAmount.value })))
    closeModal()

  } catch (error) {
    console.error('[Deposit] Transfer error:', error)
    
    if (error.code === 4001) {
      alert(t('depositModal.transactionCancelled'))
    } else if (error.code === -32000) {
      alert(withSelectedToken(t('depositModal.insufficientBalance')))
    } else {
      alert(error.message || t('depositModal.transferFailed'))
    }
  } finally {
    isProcessing.value = false
  }
}

/**
 * 提交充值记录到后端
 * 后端会验证区块链交易状态
 * @param {string} transactionHash - 交易哈希
 * @returns {Promise<{success: boolean, message?: string}>}
 */
const submitDepositRecord = async (transactionHash) => {
  try {
    // 使用安全API工具发送请求（自动包含CSRF令牌）
    const data = await post('/api/user/deposit', {
      wallet_address: walletStore.walletAddress,
      amount: depositAmount.value,
      tx_hash: transactionHash,
      token: selectedToken.value,
      chain: selectedChain.value  // 添加链信息
    })

    // ✅ secureApi 工具已处理错误，直接检查 success 字段
    if (data.success) {
      // 更新钱包余额
      const usdtBalance = parseFloat(data.data.new_balance.usdt) || 0
      const wldBalance = parseFloat(data.data.new_balance.wld) || 0

      walletStore.setUsdtBalance(data.data.new_balance.usdt)
      walletStore.setWldBalance(data.data.new_balance.wld)

      // 更新总权益值（USDT 余额 + WLD 折算）
      const wldPrice = 0 // TODO: 从价格 API 获取 WLD 价格
      const totalEquity = usdtBalance + (wldBalance * wldPrice)
      walletStore.setEquityValue(totalEquity.toFixed(4))

      console.log('[Deposit] Balance updated:', {
        usdt: data.data.new_balance.usdt,
        wld: data.data.new_balance.wld,
        equity: totalEquity.toFixed(4)
      })
      
      return { success: true }
    } else {
      console.error('[Deposit] Server rejected deposit:', data.message)
      return { success: false, message: data.message }
    }
  } catch (error) {
    console.error('[Deposit] Submit record error:', error)
    return { success: false, message: error.message }
  }
}
</script>

<style scoped src="../styles/components/deposit-modal.css"></style>
