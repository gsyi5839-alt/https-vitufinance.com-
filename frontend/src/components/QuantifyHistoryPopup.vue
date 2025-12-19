<template>
  <!-- 
    量化收益明细弹窗组件
    
    Props:
    - visible: 是否显示弹窗
    
    Events:
    - update:visible: 更新显示状态
    - close: 关闭弹窗
  -->
  <Teleport to="body">
    <div v-if="visible" class="quantify-history-overlay" @click.self="closePopup">
      <div class="quantify-history-popup">
        <!-- 头部 -->
        <div class="popup-header">
          <h2 class="popup-title">{{ t('quantifyHistory.title') }}</h2>
          <button class="close-btn" @click="closePopup">×</button>
        </div>

        <!-- 统计卡片（可点击筛选） -->
        <div class="stats-section">
          <div class="stats-grid">
            <div 
              class="stat-card clickable" 
              :class="{ active: activeFilter === 'today' }"
              @click="setFilter('today')"
            >
              <span class="stat-label">{{ t('quantifyHistory.todayEarnings') }}</span>
              <span class="stat-value">{{ stats.today_earnings }} USDT</span>
            </div>
            <div 
              class="stat-card clickable" 
              :class="{ active: activeFilter === 'week' }"
              @click="setFilter('week')"
            >
              <span class="stat-label">{{ t('quantifyHistory.weekEarnings') }}</span>
              <span class="stat-value">{{ stats.week_earnings }} USDT</span>
            </div>
            <div 
              class="stat-card clickable" 
              :class="{ active: activeFilter === 'month' }"
              @click="setFilter('month')"
            >
              <span class="stat-label">{{ t('quantifyHistory.monthEarnings') }}</span>
              <span class="stat-value">{{ stats.month_earnings }} USDT</span>
            </div>
            <div 
              class="stat-card highlight clickable" 
              :class="{ active: activeFilter === 'all' }"
              @click="setFilter('all')"
            >
              <span class="stat-label">{{ t('quantifyHistory.totalEarnings') }}</span>
              <span class="stat-value">{{ stats.total_earnings }} USDT</span>
            </div>
          </div>
        </div>

        <!-- 收益明细列表 -->
        <div class="history-section">
          <h3 class="section-title">{{ t('quantifyHistory.historyTitle') }}</h3>
          
          <!-- 加载中 -->
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>{{ t('common.loading') }}</p>
          </div>

          <!-- 无记录 -->
          <div v-else-if="records.length === 0" class="empty-state">
            <p>{{ t('quantifyHistory.noRecords') }}</p>
          </div>

          <!-- 记录列表 -->
          <div v-else class="history-list">
            <div 
              v-for="record in records" 
              :key="record.id" 
              class="history-item"
              :class="{ 'high-robot': record.robot_type === 'high' }"
            >
              <div class="item-left">
                <div class="robot-name">{{ record.robot_name }}</div>
                <div class="robot-info">
                  <span class="robot-type" :class="record.robot_type || 'cex'">
                    {{ getRobotTypeLabel(record.robot_type) }}
                  </span>
                  <span class="principal">{{ t('quantifyHistory.principal') }}: {{ formatNumber(record.principal) }}</span>
                </div>
                <div class="time">{{ formatDateTime(record.created_at) }}</div>
              </div>
              <div class="item-right">
                <span class="earnings" :class="{ 'zero': parseFloat(record.earnings) === 0 }">
                  +{{ formatNumber(record.earnings) }} USDT
                </span>
              </div>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMore" class="load-more">
              <button 
                class="load-more-btn" 
                :disabled="loadingMore"
                @click="loadMore"
              >
                {{ loadingMore ? t('common.loading') : t('quantifyHistory.loadMore') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * 量化收益明细弹窗组件
 * 显示用户的量化收益统计和历史记录
 */
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'

const { t } = useI18n()
const walletStore = useWalletStore()

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'close'])

// 状态
const loading = ref(false)
const loadingMore = ref(false)
const records = ref([])
const stats = ref({
  today_earnings: '0.0000',
  week_earnings: '0.0000',
  month_earnings: '0.0000',
  total_earnings: '0.0000',
  total_count: 0
})
const total = ref(0)
const offset = ref(0)
const limit = 20

// 筛选状态：today | week | month | all
const activeFilter = ref('all')

// 是否有更多记录
const hasMore = computed(() => records.value.length < total.value)

// 监听弹窗显示
watch(() => props.visible, async (newVal) => {
  if (newVal && walletStore.isConnected) {
    await loadData()
  }
})

/**
 * 加载数据
 */
const loadData = async () => {
  loading.value = true
  offset.value = 0
  records.value = []
  
  try {
    // 并行获取统计和记录
    await Promise.all([
      fetchStats(),
      fetchHistory()
    ])
  } finally {
    loading.value = false
  }
}

/**
 * 获取统计数据
 */
const fetchStats = async () => {
  try {
    const response = await fetch(`/api/robot/quantify-stats?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      stats.value = data.data
    }
  } catch (error) {
    console.error('[QuantifyHistory] Failed to fetch stats:', error)
  }
}

/**
 * 获取收益记录（支持时间范围筛选）
 */
const fetchHistory = async () => {
  try {
    // 构建 API URL，添加时间范围参数
    let url = `/api/robot/quantify-history?wallet_address=${walletStore.walletAddress}&limit=${limit}&offset=${offset.value}`
    
    // 根据筛选条件添加时间范围
    if (activeFilter.value !== 'all') {
      url += `&period=${activeFilter.value}`
    }
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.success) {
      if (offset.value === 0) {
        records.value = data.data.records
      } else {
        records.value = [...records.value, ...data.data.records]
      }
      total.value = data.data.total
    }
  } catch (error) {
    console.error('[QuantifyHistory] Failed to fetch history:', error)
  }
}

/**
 * 设置筛选条件并重新加载数据
 */
const setFilter = async (filter) => {
  if (activeFilter.value === filter) return
  
  activeFilter.value = filter
  loading.value = true
  offset.value = 0
  records.value = []
  
  try {
    await fetchHistory()
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  offset.value += limit
  
  try {
    await fetchHistory()
  } finally {
    loadingMore.value = false
  }
}

/**
 * 关闭弹窗
 */
const closePopup = () => {
  emit('update:visible', false)
  emit('close')
}

/**
 * 格式化数字
 */
const formatNumber = (num) => {
  if (!num) return '0.00'
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 获取机器人类型标签
 */
const getRobotTypeLabel = (type) => {
  const labels = {
    'cex': 'CEX',
    'dex': 'DEX',
    'grid': 'Grid',
    'high': 'High'
  }
  return labels[type] || 'CEX'
}
</script>

<style scoped>
/* 弹窗遮罩 */
.quantify-history-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗容器 */
.quantify-history-popup {
  width: 90%;
  max-width: 420px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1f1f23 0%, #15151a 100%);
  border: 1px solid rgba(245, 182, 56, 0.2);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部 */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 统计区域 */
.stats-section {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s ease;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.stat-card.active {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.4);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.2);
}

.stat-card.highlight {
  background: rgba(245, 182, 56, 0.1);
  border-color: rgba(245, 182, 56, 0.2);
}

.stat-card.highlight.active {
  background: rgba(245, 182, 56, 0.2);
  border-color: rgba(245, 182, 56, 0.5);
  box-shadow: 0 0 12px rgba(245, 182, 56, 0.3);
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: rgb(76, 175, 80);
}

.stat-card.highlight .stat-value {
  color: rgb(245, 182, 56);
}

/* 收益明细区域 */
.history-section {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 12px 0;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.5);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(245, 182, 56, 0.2);
  border-top-color: rgb(245, 182, 56);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.5);
}

/* 记录列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.history-item.high-robot {
  border-color: rgba(245, 182, 56, 0.15);
}

.item-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.robot-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.robot-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.robot-type {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.robot-type.cex,
.robot-type.dex {
  background: rgba(99, 102, 241, 0.2);
  color: rgb(99, 102, 241);
}

.robot-type.grid {
  background: rgba(76, 175, 80, 0.2);
  color: rgb(76, 175, 80);
}

.robot-type.high {
  background: rgba(245, 182, 56, 0.2);
  color: rgb(245, 182, 56);
}

.principal {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.item-right {
  text-align: right;
}

.earnings {
  font-size: 16px;
  font-weight: 600;
  color: rgb(76, 175, 80);
}

.earnings.zero {
  color: rgba(255, 255, 255, 0.4);
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px 0;
}

.load-more-btn {
  padding: 10px 24px;
  background: rgba(245, 182, 56, 0.1);
  border: 1px solid rgba(245, 182, 56, 0.3);
  border-radius: 8px;
  color: rgb(245, 182, 56);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(245, 182, 56, 0.2);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端适配 */
@media (max-width: 400px) {
  .quantify-history-popup {
    width: 95%;
    max-height: 90vh;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 10px;
  }

  .stat-value {
    font-size: 13px;
  }
}
</style>

