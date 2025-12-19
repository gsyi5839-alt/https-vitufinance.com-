<template>
  <div class="assets-page">
    <div class="page-container">
      <!-- 权益卡片 -->
      <AssetsEquityCard
        :today-earnings="assetsData.todayEarnings.value"
        :format-today-earnings="assetsData.formatTodayEarnings.value"
        :total-referral-reward="assetsData.totalReferralReward.value"
        :total-team-reward="assetsData.totalTeamReward.value"
        @open-quantify-history="showQuantifyHistory = true"
        @open-details="openDetailsDrawer"
      />

      <!-- 操作按钮 -->
      <AssetsActionButtons
        @open-deposit="showDepositModal = true"
        @open-withdraw="showWithdrawModal = true"
      />

      <!-- 闪兑功能 - 按需加载 -->
      <Suspense>
        <template #default>
          <AssetsFlashExchange
            v-if="shouldLoadExchange"
            :wld-price="assetsData.exchangeWldPrice.value"
            :user-level="assetsData.userLevel.value"
            :daily-redeemable-wld="assetsData.dailyRedeemableWld.value"
            :today-exchanged-wld="assetsData.todayExchangedWld.value"
            @refresh="assetsData.forceRefresh"
          />
        </template>
        <template #fallback>
          <div class="loading-placeholder">{{ t('common.loading') }}</div>
        </template>
      </Suspense>

      <!-- 信息卡片网格 -->
      <AssetsInfoCards
        @open-document="handleOpenDocument"
        @open-safe="showSafeModal = true"
      />
    </div>

    <!-- 充值弹窗 -->
    <DepositModal 
      v-model:visible="showDepositModal" 
      @success="handleDepositSuccess"
    />

    <!-- 提款弹窗 -->
    <WithdrawModal 
      v-model:visible="showWithdrawModal" 
      @success="handleWithdrawSuccess"
    />

    <!-- 量化收益明细弹窗 -->
    <QuantifyHistoryPopup 
      v-model:visible="showQuantifyHistory"
    />

    <!-- 详情抽屉 - 按需加载 -->
    <Suspense v-if="showDetailsDrawer">
      <template #default>
        <AssetsDetailsDrawer
          v-model:visible="showDetailsDrawer"
          :selected-asset="selectedAsset"
          :wld-price="assetsData.wldPrice.value"
          :checkin-records="assetsData.checkinRecords.value"
          :all-usdt-records="assetsData.allUsdtRecords.value"
        />
      </template>
      <template #fallback>
        <div class="loading-overlay">{{ t('common.loading') }}</div>
      </template>
    </Suspense>

    <!-- 保险箱弹窗 - 按需加载 -->
    <Suspense v-if="showSafeModal">
      <template #default>
        <AssetsSafeModal
          v-model:visible="showSafeModal"
          :safe-status="assetsData.safeStatus.value"
          @refresh="assetsData.fetchSafeStatus"
        />
      </template>
      <template #fallback>
        <div class="loading-overlay">{{ t('common.loading') }}</div>
      </template>
    </Suspense>

    <!-- 文档查看器 - 按需加载 -->
    <Teleport to="body">
      <Suspense v-if="showDocViewer">
        <template #default>
          <AssetsDocViewer
            v-model:visible="showDocViewer"
            :doc-url="currentDocUrl"
            :doc-title="currentDocTitle"
            :doc-type="currentDocType"
          />
        </template>
        <template #fallback>
          <div class="loading-overlay">{{ t('common.loading') }}</div>
        </template>
      </Suspense>
    </Teleport>

    <BottomNav />
  </div>
</template>

<script setup>
/**
 * Assets 页面 - 优化版
 * 
 * 优化策略:
 * 1. 拆分成多个小组件(每个<500行)
 * 2. 使用Composable管理数据和逻辑
 * 3. 按需加载重型组件(Suspense)
 * 4. 添加请求缓存和防抖
 * 5. 优化定时器和轮询
 */
import { ref, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useAssetsData, clearCache } from '@/composables/useAssetsData'
import { refreshBalances } from '@/utils/wallet'
import { trackDeposit, trackWithdraw } from '@/utils/tracker'

// 同步加载关键组件
import BottomNav from '@/components/BottomNav.vue'
import DepositModal from '@/components/DepositModal.vue'
import WithdrawModal from '@/components/WithdrawModal.vue'
import QuantifyHistoryPopup from '@/components/QuantifyHistoryPopup.vue'
import AssetsEquityCard from '@/components/assets/AssetsEquityCard.vue'
import AssetsActionButtons from '@/components/assets/AssetsActionButtons.vue'
import AssetsInfoCards from '@/components/assets/AssetsInfoCards.vue'

// 异步加载非关键组件
const AssetsFlashExchange = defineAsyncComponent(() =>
  import('@/components/assets/AssetsFlashExchange.vue')
)
const AssetsDetailsDrawer = defineAsyncComponent(() =>
  import('@/components/assets/AssetsDetailsDrawer.vue')
)
const AssetsSafeModal = defineAsyncComponent(() =>
  import('@/components/assets/AssetsSafeModal.vue')
)
const AssetsDocViewer = defineAsyncComponent(() =>
  import('@/components/assets/AssetsDocViewer.vue')
)

const { t } = useI18n()
const router = useRouter()
const walletStore = useWalletStore()

// 使用数据管理Composable
const assetsData = useAssetsData()

// ==================== 弹窗状态 ====================
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)
const showQuantifyHistory = ref(false)
const showDetailsDrawer = ref(false)
const showSafeModal = ref(false)
const showDocViewer = ref(false)

// ==================== 详情抽屉状态 ====================
const selectedAsset = ref('USDT')

// ==================== 文档查看器状态 ====================
const currentDocUrl = ref('')
const currentDocTitle = ref('')
const currentDocType = ref('image')

// ==================== 优化: 按需加载闪兑组件 ====================
const shouldLoadExchange = ref(false)

// ==================== 自动刷新优化 ====================
let refreshInterval = null
const REFRESH_INTERVAL = 60000 // 优化: 从30秒改为60秒,减少服务器压力

/**
 * 刷新所有数据
 */
const refreshAllData = async () => {
  // 只在页面可见时刷新
  if (document.hidden) {
    console.log('[Assets] 页面不可见,跳过刷新')
    return
  }
  
  console.log('[Assets] 自动刷新数据...')
  
  try {
    // 并行刷新余额和数据
    await Promise.all([
      refreshBalances(walletStore),
      assetsData.refreshAllData()
    ])
  } catch (error) {
    console.error('[Assets] 刷新失败:', error)
  }
}

/**
 * 启动自动刷新
 */
const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshInterval = setInterval(refreshAllData, REFRESH_INTERVAL)
  console.log('[Assets] 自动刷新已启动 (60秒间隔)')
}

/**
 * 停止自动刷新
 */
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
    console.log('[Assets] 自动刷新已停止')
  }
}

/**
 * 页面可见性变化处理
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('[Assets] 页面变为可见,刷新数据...')
    refreshAllData()
    startAutoRefresh()
  } else {
    console.log('[Assets] 页面不可见,停止刷新')
    stopAutoRefresh()
  }
}

// ==================== 事件处理 ====================

/**
 * 打开详情抽屉
 */
const openDetailsDrawer = (asset) => {
  selectedAsset.value = asset
  showDetailsDrawer.value = true
}

/**
 * 打开文档
 */
const handleOpenDocument = (docInfo) => {
  currentDocUrl.value = docInfo.url
  currentDocTitle.value = docInfo.title
  currentDocType.value = docInfo.type
  showDocViewer.value = true
}

/**
 * 充值成功回调
 */
const handleDepositSuccess = (data) => {
  console.log('[Assets] 充值成功:', data)
  trackDeposit(data.amount, data.chain)
  
  // 清除缓存并强制刷新
  clearCache()
  refreshAllData()
}

/**
 * 提现成功回调
 */
const handleWithdrawSuccess = (data) => {
  console.log('[Assets] 提现成功:', data)
  trackWithdraw(data.amount, data.chain)
  
  // 清除缓存并强制刷新
  clearCache()
  refreshAllData()
}

// ==================== 生命周期 ====================

onMounted(async () => {
  console.log('[Assets] 页面加载')
  
  // 初始化数据
  await assetsData.initializeData()
  
  // 刷新余额
  if (walletStore.isConnected) {
    await refreshBalances(walletStore)
  }
  
  // 延迟加载闪兑组件(非关键功能)
  setTimeout(() => {
    shouldLoadExchange.value = true
  }, 1000)
  
  // 启动自动刷新
  startAutoRefresh()
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  console.log('[Assets] 页面卸载')
  
  // 停止自动刷新
  stopAutoRefresh()
  
  // 移除事件监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 监听钱包连接状态
watch(() => walletStore.isConnected, async (connected) => {
  if (connected) {
    console.log('[Assets] 钱包已连接,刷新数据')
    clearCache()
    await refreshAllData()
  }
})
</script>

<style scoped>
.assets-page {
  min-height: 100vh;
  background: var(--UI-BG-0);
  padding-top: 108px;
  padding-bottom: 80px;
  color: var(--UI-FG-0);
}

.page-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 加载占位符 */
.loading-placeholder,
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}

/* 响应式 */
@media (max-width: 768px) {
  .assets-page {
    padding-top: 80px;
  }
  
  .page-container {
    padding: 0 12px;
  }
}
</style>

