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
        <p class="tip-text">{{ t('depositModal.minDepositTip') }}</p>
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
/**
 * 充值弹窗组件
 * 
 * 功能：
 * - 输入充值金额
 * - 调用钱包进行 USDT 转账
 * - 提交充值记录到后端
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'
import { useCsrfStore } from '@/stores/csrf'
import { post } from '@/api/secureApi'
import { isDAppBrowser, getNetworkInfo } from '@/utils/wallet'

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
const csrfStore = useCsrfStore()

// 状态
const depositAmount = ref('')
const isProcessing = ref(false)

// 链选择
const selectedChain = ref('BSC')
const supportedChains = ref(['BSC', 'ETH'])
const chainIcons = {
  BSC: '🟡',
  ETH: '🔷'
}

// 多链钱包配置
const walletConfigs = ref({
  BSC: {
    address: '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4',
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    token: 'USDT',
    tokenContract: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
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
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorer: 'https://etherscan.io/'
  }
})

// 当前选中链的配置
const currentChainConfig = computed(() => walletConfigs.value[selectedChain.value])

// 平台收款地址（根据选中链动态获取）
const platformWalletAddress = computed(() => currentChainConfig.value?.address || '')

// 快捷金额选项
const quickAmounts = [20, 100, 300, 500, 800]

// USDT 合约地址（根据选中链动态获取）
const USDT_CONTRACT_ADDRESS = computed(() => currentChainConfig.value?.tokenContract || '')

// 计算属性
const isValidAmount = computed(() => {
  const amount = parseFloat(depositAmount.value)
  return !isNaN(amount) && amount >= 20
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
}

// 获取平台收款地址（多链）
const fetchPlatformWallet = async () => {
  try {
    const response = await fetch('/api/platform/wallet')
    const data = await response.json()
    if (data.success && data.data) {
      // 更新多链钱包配置
      if (data.data.wallets) {
        walletConfigs.value = { ...walletConfigs.value, ...data.data.wallets }
      }
      // 更新支持的链列表
      if (data.data.supportedChains) {
        supportedChains.value = data.data.supportedChains
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
 * 获取钱包中的 USDT 余额（链上余额）
 * 注意：ETH的USDT是6位小数，BSC的USDT是18位小数
 * @returns {Promise<number>} USDT 余额
 */
const getWalletUsdtBalance = async () => {
  try {
    const ethereum = window.ethereum
    if (!ethereum) return 0
    
    const chainConfig = currentChainConfig.value
    
    // 调用 USDT 合约的 balanceOf 方法
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
    
    console.log(`[Deposit] Wallet USDT balance on ${selectedChain.value}:`, balance)
    return balance
  } catch (error) {
    console.error('[Deposit] Failed to get USDT balance:', error)
    return 0
  }
}

// 处理充值
const handleDeposit = async () => {
  if (!isValidAmount.value) {
    alert(t('depositModal.enterValidAmount'))
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
    const chainConfig = currentChainConfig.value
    
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
    
    // ✅ 检查钱包 USDT 余额是否足够
    const walletBalance = await getWalletUsdtBalance()
    if (walletBalance < amount) {
      // 显示余额不足提示
      const message = t('depositModal.walletInsufficientBalance', { balance: walletBalance.toFixed(4) })
      // 如果翻译返回原始键名，使用后备文本
      const displayMessage = message.includes('depositModal.') 
        ? `Insufficient USDT in wallet. Current balance: ${walletBalance.toFixed(4)} USDT`
        : message
      alert(displayMessage)
      isProcessing.value = false
      return
    }

    // 构造 USDT 转账数据
    // transfer(address to, uint256 amount)
    // 函数签名: 0xa9059cbb
    // 注意：ETH的USDT是6位小数，BSC的USDT是18位小数
    const decimals = chainConfig.decimals
    const amountWei = BigInt(Math.floor(amount * Math.pow(10, decimals))).toString(16).padStart(64, '0')
    const toAddress = platformWalletAddress.value.slice(2).padStart(64, '0')
    const data = '0xa9059cbb' + toAddress + amountWei

    // 发送交易
    const transactionHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletStore.walletAddress,
        to: USDT_CONTRACT_ADDRESS.value,
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
      txHash: transactionHash
    })

    alert(t('depositModal.depositSuccess', { amount: depositAmount.value }))
    closeModal()

  } catch (error) {
    console.error('[Deposit] Transfer error:', error)
    
    if (error.code === 4001) {
      alert(t('depositModal.transactionCancelled'))
    } else if (error.code === -32000) {
      alert(t('depositModal.insufficientBalance'))
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
      token: 'USDT',
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

<style scoped>
/* 遮罩层 */
.deposit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10100;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗容器 - 增加高度以容纳链选择 */
.deposit-modal {
  width: 302px;
  max-height: 80vh;  /* 最大高度为视口80%，适配小屏 */
  /* 移除背景图片，使用渐变背景 */
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 20px 20px 24px 20px;  /* 调整padding */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease-out;
  overflow: hidden;  /* 容器本身不滚动 */
}

/* 可滚动内容区域 */
.modal-content {
  flex: 1;
  overflow-y: auto;  /* 内容区独立滚动 */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;  /* iOS平滑滚动 */
  margin: 0 -4px;  /* 补偿滚动条空间 */
  padding: 0 4px;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 标题 */
.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 16px 0;
  text-align: center;
}

/* 链选择区域 */
.chain-select-section {
  margin-bottom: 12px;
}

.chain-buttons {
  display: flex;
  gap: 10px;
}

.chain-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}

.chain-btn:hover {
  background: rgba(245, 182, 56, 0.15);
  border-color: rgba(245, 182, 56, 0.5);
  transform: translateY(-2px);
}

.chain-btn.selected {
  background: linear-gradient(135deg, rgba(245, 182, 56, 0.3) 0%, rgba(245, 182, 56, 0.15) 100%);
  border-color: rgb(245, 182, 56);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(245, 182, 56, 0.3);
}

/* 链图标图片样式 */
.chain-logo-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.chain-icon {
  font-size: 24px;
  line-height: 1;
}

.chain-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.chain-name {
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
}

.chain-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

/* 输入区域 */
.input-section {
  margin-bottom: 12px;
}

.input-label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.amount-input-wrapper {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.amount-input {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* 快捷金额按钮 */
.quick-amounts {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-amount-btn {
  flex: 1;
  padding: 8px 4px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-amount-btn:hover {
  background: rgba(245, 182, 56, 0.2);
  border-color: rgb(245, 182, 56);
}

.quick-amount-btn.selected {
  background: rgb(245, 182, 56);
  border-color: rgb(245, 182, 56);
  color: #000000;
  font-weight: 600;
}

/* 提示文字 */
.tip-text {
  font-size: 12px;
  color: rgb(245, 182, 56);
  text-align: center;
  margin: 0 0 12px 0;
  flex-shrink: 0;
}

/* 按钮区域 - 固定在底部 */
.button-group {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
  padding-top: 12px;  /* 与内容区分隔 */
  margin-top: 0;  /* 移除 auto，由内容区控制 */
}

.btn-cancel {
  flex: 1;
  height: 44px;
  background: rgba(100, 100, 100, 0.8);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(80, 80, 80, 0.9);
}

.btn-cancel:active {
  transform: scale(0.98);
}

.btn-sure {
  flex: 1;
  height: 44px;
  background: rgb(245, 182, 56);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-sure:hover:not(:disabled) {
  background: rgb(255, 192, 66);
}

.btn-sure:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-sure:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端适配 - 修复滚动问题 */
@media (max-width: 380px) {
  .deposit-modal {
    width: 92vw;  /* 使用视口宽度百分比 */
    max-width: 340px;
    max-height: 85vh;
    padding: 18px 16px 20px 16px;
  }
}

@media (max-width: 340px) {
  .deposit-modal {
    width: 94vw;
    max-width: 320px;
    max-height: 90vh;  /* 小屏设备允许更多空间 */
    padding: 16px 14px 18px 14px;
  }

  .modal-title {
    font-size: 18px;
    margin-bottom: 10px;
  }

  .chain-btn {
    padding: 8px 6px;
    font-size: 12px;
  }

  .chain-logo-img {
    width: 28px;
    height: 28px;
  }

  .quick-amount-btn {
    font-size: 12px;
    padding: 6px 2px;
  }

  .btn-cancel,
  .btn-sure {
    height: 40px;
    font-size: 15px;
  }
  
  .button-group {
    padding-top: 10px;
    gap: 12px;
  }
}

/* 超小屏设备适配 (如 Redmi 9 系列) */
@media (max-width: 320px) {
  .deposit-modal {
    width: 96vw;
    max-height: 92vh;
    padding: 14px 12px 16px 12px;
  }
  
  .modal-content {
    margin: 0 -2px;
    padding: 0 2px;
  }
  
  .chain-buttons {
    gap: 6px;
  }
  
  .chain-btn {
    padding: 6px 4px;
    font-size: 11px;
  }
  
  .chain-logo-img {
    width: 24px;
    height: 24px;
  }
  
  .quick-amounts {
    gap: 4px;
    margin-bottom: 12px;
  }
  
  .quick-amount-btn {
    font-size: 11px;
    padding: 6px 2px;
  }
  
  .amount-input {
    font-size: 18px;
    padding: 10px 12px;
  }
  
  .button-group {
    padding-top: 8px;
    gap: 10px;
  }
  
  .tip-text {
    margin-bottom: 8px;
  }
}
</style>
