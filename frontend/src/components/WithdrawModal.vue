<template>
  <!-- 成功提示弹窗 -->
  <div v-if="showSuccessDialog" class="success-dialog-overlay" @click.self="closeSuccessDialog">
    <div class="success-dialog">
      <h3 class="success-title">{{ t('common.tips') }}</h3>
      <div class="success-content">
        <p>{{ t('withdrawModal.requestSubmitted') }}</p>
        <p>{{ t('withdrawModal.amount') }}: {{ successInfo.amount }} USDT</p>
        <p>{{ t('withdrawModal.fee') }}: {{ successInfo.fee }} USDT</p>
        <p>{{ t('withdrawModal.youWillReceive') }}: {{ successInfo.actualAmount }} USDT</p>
      </div>
      <button class="success-btn" @click="closeSuccessDialog">{{ t('common.confirm') }}</button>
    </div>
  </div>

  <!-- 提款弹窗 -->
  <div v-if="visible" class="withdraw-modal-overlay" @click.self="closeModal">
    <div class="withdraw-modal">
      <!-- 标题 -->
      <h2 class="modal-title">{{ t('withdrawModal.title') }}</h2>
      
      <!-- 输入区域 -->
      <div class="input-section">
        <label class="input-label">{{ t('withdrawModal.enterAmount') }}</label>
        <div class="amount-input-wrapper">
          <input 
            v-model="withdrawAmount" 
            type="number" 
            min="5"
            step="0.01"
            placeholder="0"
            class="amount-input"
          />
          <button class="max-btn" @click="setMaxAmount">MAX</button>
        </div>
      </div>
      
      <!-- 提示文字 -->
      <p class="tip-text">
        {{ t('withdrawModal.tipText') }}
      </p>
      
      <!-- 按钮区域 -->
      <div class="button-group">
        <button class="btn-cancel" @click="closeModal">{{ t('common.cancel') }}</button>
        <button 
          class="btn-sure" 
          :disabled="!isValidAmount || isProcessing"
          @click="handleWithdraw"
        >
          {{ isProcessing ? 'Processing...' : 'Sure' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 提款弹窗组件
 * 
 * 功能：
 * - 输入提款金额
 * - MAX 一键填入最大可提款金额
 * - 提交提款申请到后端
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'

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
const withdrawAmount = ref('')
const isProcessing = ref(false)
const userBalance = ref(0)

// 成功弹窗状态
const showSuccessDialog = ref(false)
const successInfo = ref({
  amount: 0,
  fee: '0',
  actualAmount: '0'
})

// 计算属性
const isValidAmount = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  return !isNaN(amount) && amount >= 5 && amount <= userBalance.value
})

// 监听弹窗显示状态，重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    fetchUserBalance()
  }
})

// 重置表单
const resetForm = () => {
  withdrawAmount.value = ''
  isProcessing.value = false
}

// 获取用户余额
const fetchUserBalance = async () => {
  if (!walletStore.isConnected) return
  
  try {
    const response = await fetch(`/api/user/balance?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    if (data.success) {
      userBalance.value = parseFloat(data.data.usdt_balance) || 0
    }
  } catch (error) {
    console.error('Failed to fetch user balance:', error)
  }
}

// 关闭弹窗
const closeModal = () => {
  emit('update:visible', false)
}

// 关闭成功弹窗
const closeSuccessDialog = () => {
  showSuccessDialog.value = false
  closeModal()
}

// 设置最大金额
const setMaxAmount = () => {
  if (userBalance.value > 0) {
    withdrawAmount.value = userBalance.value.toString()
  }
}

// 处理提款
const handleWithdraw = async () => {
  if (!isValidAmount.value) {
    if (parseFloat(withdrawAmount.value) < 5) {
      alert(t('withdrawModal.minWithdrawAmount'))
    } else if (parseFloat(withdrawAmount.value) > userBalance.value) {
      alert(t('withdrawModal.insufficientBalance'))
    } else {
      alert(t('withdrawModal.enterValidAmount'))
    }
    return
  }

  if (!walletStore.isConnected) {
    alert(t('withdrawModal.connectWalletFirst'))
    return
  }

  isProcessing.value = true

  try {
    const amount = parseFloat(withdrawAmount.value)
    const fee = amount * 0.005 // 0.5% 手续费（千分之五）
    const actualAmount = amount - fee

    const response = await fetch('/api/user/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        amount: amount,
        fee: fee,
        actual_amount: actualAmount,
        to_address: walletStore.walletAddress
      })
    })

    const data = await response.json()

    if (data.success) {
      // 更新钱包余额
      if (data.data.new_balance) {
        walletStore.setUsdtBalance(data.data.new_balance)
      }
      
      // 触发成功事件
      emit('success', {
        amount: amount,
        fee: fee,
        actualAmount: actualAmount
      })

      // 显示成功提示弹窗
      showSuccessDialog.value = true
      successInfo.value = {
        amount: amount,
        fee: fee.toFixed(4),
        actualAmount: actualAmount.toFixed(4)
      }
    } else {
      alert(data.message || 'Withdrawal failed')
    }

  } catch (error) {
    console.error('[Withdraw] Error:', error)
    alert(error.message || 'Withdrawal failed')
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
/* 成功弹窗遮罩 */
.success-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10200;
}

/* 成功弹窗 */
.success-dialog {
  width: 320px;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.success-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.success-content {
  margin-bottom: 20px;
}

.success-content p {
  font-size: 15px;
  color: #333333;
  margin: 8px 0;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.success-btn {
  width: 100%;
  height: 44px;
  background: transparent;
  border: none;
  font-size: 17px;
  font-weight: 600;
  color: #007AFF;
  cursor: pointer;
  border-top: 1px solid #e5e5e5;
  margin: 0 -24px -24px -24px;
  width: calc(100% + 48px);
  border-radius: 0 0 16px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.success-btn:active {
  background: rgba(0, 122, 255, 0.1);
}

/* 遮罩层 */
.withdraw-modal-overlay {
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

/* 弹窗容器 - 302 x 325 */
.withdraw-modal {
  width: 302px;
  height: 325px;
  background-image: url('/static/YAOQI/8.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 24px;
  padding: 24px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease-out;
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
  margin: 0 0 24px 0;
  text-align: center;
}

/* 输入区域 */
.input-section {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
  text-align: center;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.amount-input {
  flex: 1;
  min-width: 0;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.max-btn {
  width: 60px;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: rgb(245, 182, 56);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  white-space: nowrap;
  text-align: center;
}

.max-btn:hover {
  color: rgb(255, 200, 80);
}

/* 提示文字 */
.tip-text {
  font-size: 12px;
  color: rgb(245, 182, 56);
  text-align: left;
  margin: 0 0 auto 0;
  line-height: 1.5;
}

/* 按钮区域 */
.button-group {
  display: flex;
  gap: 16px;
  margin-top: auto;
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

/* 移动端适配 */
@media (max-width: 340px) {
  .withdraw-modal {
    width: 290px;
    height: 310px;
    padding: 20px 16px;
  }

  .modal-title {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .tip-text {
    font-size: 11px;
  }

  .btn-cancel,
  .btn-sure {
    height: 40px;
    font-size: 15px;
  }
}
</style>

