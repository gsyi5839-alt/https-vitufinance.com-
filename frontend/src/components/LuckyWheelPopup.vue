<template>
  <!-- 抽奖弹窗遮罩 -->
  <div v-if="visible" class="lucky-wheel-overlay" @click.self="closePopup">
    <div class="lucky-wheel-popup">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="closePopup">×</button>
      
      <!-- 转盘区域 -->
      <div class="wheel-container">
        <!-- 转盘类型标签 -->
        <div class="wheel-type-label">{{ currentWheelLabel }}</div>
        
        <!-- 转盘主体 -->
        <div class="wheel-wrapper">
          <!-- 指针 -->
          <div class="wheel-pointer">
            <div class="pointer-arrow"></div>
          </div>
          
          <!-- 转盘背景 -->
          <div 
            class="wheel" 
            :style="{ transform: `rotate(${wheelRotation}deg)` }"
            :class="{ 'spinning': isSpinning }"
          >
            <!-- 扇区0: 1 BTC - 顶部偏右 -->
            <div class="prize-item prize-0">
              <span class="prize-icon">₿</span>
              <span class="prize-text">1</span>
              <span class="prize-unit">BTC</span>
            </div>
            <!-- 扇区1: 200 USDT - 右上 -->
            <div class="prize-item prize-1">
              <span class="prize-icon">💎</span>
              <span class="prize-text">200</span>
              <span class="prize-unit">USDT</span>
            </div>
            <!-- 扇区2: 5 WLD - 右侧 -->
            <div class="prize-item prize-2">
              <span class="prize-icon">🌍</span>
              <span class="prize-text">5</span>
              <span class="prize-unit">WLD</span>
            </div>
            <!-- 扇区3: 100 USDT - 右下 -->
            <div class="prize-item prize-3">
              <span class="prize-icon">💎</span>
              <span class="prize-text">100</span>
              <span class="prize-unit">USDT</span>
            </div>
            <!-- 扇区4: 50 WLD - 底部偏右 -->
            <div class="prize-item prize-4">
              <span class="prize-icon">🌍</span>
              <span class="prize-text">50</span>
              <span class="prize-unit">WLD</span>
            </div>
            <!-- 扇区5: 30 WLD - 左下 -->
            <div class="prize-item prize-5">
              <span class="prize-icon">🌍</span>
              <span class="prize-text">30</span>
              <span class="prize-unit">WLD</span>
            </div>
            <!-- 扇区6: 5 WLD - 左侧 -->
            <div class="prize-item prize-6">
              <span class="prize-icon">🌍</span>
              <span class="prize-text">5</span>
              <span class="prize-unit">WLD</span>
            </div>
            <!-- 扇区7: 5 WLD - 左上 -->
            <div class="prize-item prize-7">
              <span class="prize-icon">🌍</span>
              <span class="prize-text">5</span>
              <span class="prize-unit">WLD</span>
            </div>
          </div>
          
          <!-- 中心抽奖按钮 -->
          <button 
            class="spin-btn" 
            :class="{ 'disabled': isSpinning }"
            :disabled="isSpinning"
            @click="startSpin"
          >
            <span class="spin-text">{{ isSpinning ? t('luckyWheel.spinning') : (canSpin ? t('luckyWheel.spinNow') : t('luckyWheel.insufficientPoints')) }}</span>
          </button>
        </div>
      </div>
      
      <!-- 转盘类型选择 -->
      <div class="wheel-types">
        <button 
          v-for="(config, type) in wheelTypes" 
          :key="type"
          class="wheel-type-btn"
          :class="{ 'active': currentWheelType === type }"
          @click="selectWheelType(type)"
        >
          <span class="type-name">{{ config.name }}</span>
          <span class="type-points">{{ config.requiredLuckyPoints }}</span>
        </button>
      </div>
      
      <!-- 幸运值显示 -->
      <div class="lucky-points-info">
        <span class="points-label">{{ t('luckyWheel.myLuckyPoints') }}</span>
        <span class="points-value">{{ userLuckyPoints }}</span>
        <span class="points-need">{{ t('luckyWheel.needPoints', { points: currentRequiredPoints }) }}</span>
      </div>
      
      <!-- 标签页切换 -->
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ 'active': activeTab === 'announcements' }"
          @click="activeTab = 'announcements'"
        >
          {{ t('luckyWheel.winAnnouncements') }}
        </button>
        <button 
          class="tab-btn" 
          :class="{ 'active': activeTab === 'records' }"
          @click="activeTab = 'records'"
        >
          {{ t('luckyWheel.myRecords') }}
        </button>
      </div>
      
      <!-- 获奖公告 -->
      <div v-if="activeTab === 'announcements'" class="announcements-container">
        <div class="announcements-scroll" ref="announcementsRef">
          <div 
            v-for="(item, index) in announcements" 
            :key="index"
            class="announcement-item"
          >
            <span class="wallet">{{ item.walletAddress }}</span>
            <span class="prize">{{ item.prizeName }}</span>
            <span class="reward">{{ item.rewardDisplay }}</span>
          </div>
        </div>
      </div>
      
      <!-- 我的记录 -->
      <div v-if="activeTab === 'records'" class="records-container">
        <div v-if="myRecords.length === 0" class="empty-records">
          {{ t('luckyWheel.noRecords') }}
        </div>
        <div v-else class="records-list">
          <div 
            v-for="record in myRecords" 
            :key="record.id"
            class="record-item"
          >
            <div class="record-info">
              <span class="record-prize">{{ record.prize_name }}</span>
              <span class="record-wheel">{{ getWheelName(record.wheel_type) }}</span>
            </div>
            <div class="record-reward">
              +{{ record.reward_amount }} {{ record.reward_type?.toUpperCase() }}
            </div>
            <div class="record-time">{{ formatTime(record.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 中奖结果弹窗 -->
    <div v-if="showResult" class="result-overlay" @click="closeResult">
      <div class="result-popup" @click.stop>
        <div class="result-title">{{ t('luckyWheel.congratulations') }}</div>
        <div class="result-prize">{{ resultPrize?.name }}</div>
        <div class="result-reward">
          +{{ resultPrize?.rewardAmount }} {{ resultPrize?.rewardType?.toUpperCase() }}
        </div>
        <button class="result-btn" @click="closeResult">{{ t('luckyWheel.confirm') }}</button>
      </div>
    </div>
    
    <!-- 提示弹窗 -->
    <div v-if="showTip" class="tip-overlay" @click="showTip = false">
      <div class="tip-popup" @click.stop>
        <div class="tip-content">{{ tipMessage }}</div>
        <button class="tip-btn" @click="showTip = false">{{ t('luckyWheel.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'update:visible'])

// i18n
const { t } = useI18n()

// 钱包 store
const walletStore = useWalletStore()

// 状态
const isSpinning = ref(false)
const wheelRotation = ref(0)
const currentWheelType = ref('silver')
const activeTab = ref('announcements')
const userLuckyPoints = ref(0)
const announcements = ref([])
const myRecords = ref([])
const showResult = ref(false)
const resultPrize = ref(null)
const showTip = ref(false)
const tipMessage = ref('')

// 转盘类型配置（使用 computed 支持动态翻译）
const wheelTypes = computed(() => ({
  silver: { name: t('luckyWheel.silver'), requiredLuckyPoints: 3000, multiplier: 1 },
  gold: { name: t('luckyWheel.gold'), requiredLuckyPoints: 10000, multiplier: 2 },
  diamond: { name: t('luckyWheel.diamond'), requiredLuckyPoints: 30000, multiplier: 5 }
}))

// 8个扇区的奖品显示 - 与后端 PRIZES ID 对应
// 后端奖品: 1=特等奖BTC, 2=一等奖200USDT, 3=二等奖100USDT, 4=三等奖50WLD, 5=四等奖30WLD, 6=五等奖5WLD
const displayPrizes = ref([
  { prizeId: 1, icon: '₿', amount: '1', unit: 'BTC' },       // 扇区0: 特等奖
  { prizeId: 2, icon: '💎', amount: '200', unit: 'USDT' },   // 扇区1: 一等奖
  { prizeId: 6, icon: '🌍', amount: '5', unit: 'WLD' },      // 扇区2: 五等奖
  { prizeId: 3, icon: '💎', amount: '100', unit: 'USDT' },   // 扇区3: 二等奖
  { prizeId: 4, icon: '🌍', amount: '50', unit: 'WLD' },     // 扇区4: 三等奖
  { prizeId: 5, icon: '🌍', amount: '30', unit: 'WLD' },     // 扇区5: 四等奖
  { prizeId: 6, icon: '🌍', amount: '5', unit: 'WLD' },      // 扇区6: 五等奖（高概率，出现两次）
  { prizeId: 6, icon: '🌍', amount: '5', unit: 'WLD' }       // 扇区7: 五等奖（高概率，出现三次）
])

// 奖品ID到扇区索引的映射（有多个扇区时随机选一个）
const prizeIdToSectors = {
  1: [0],        // 特等奖 -> 扇区0
  2: [1],        // 一等奖 -> 扇区1
  3: [3],        // 二等奖 -> 扇区3
  4: [4],        // 三等奖 -> 扇区4
  5: [5],        // 四等奖 -> 扇区5
  6: [2, 6, 7]   // 五等奖 -> 扇区2/6/7（随机选一个）
}

// 计算属性 - 获取当前转盘标签（带翻译）
const currentWheelLabel = computed(() => {
  const type = currentWheelType.value
  if (type === 'silver') return t('luckyWheel.silverWheel')
  if (type === 'gold') return t('luckyWheel.goldWheel')
  if (type === 'diamond') return t('luckyWheel.diamondWheel')
  return t('luckyWheel.silverWheel')
})

const currentRequiredPoints = computed(() => {
  return wheelTypes.value[currentWheelType.value]?.requiredLuckyPoints || 3000
})

const canSpin = computed(() => {
  return userLuckyPoints.value >= currentRequiredPoints.value && walletStore.isConnected
})

// 选择转盘类型
const selectWheelType = (type) => {
  if (!isSpinning.value) {
    currentWheelType.value = type
  }
}

// 获取转盘名称（带翻译）
const getWheelName = (type) => {
  if (type === 'silver') return t('luckyWheel.silverWheel')
  if (type === 'gold') return t('luckyWheel.goldWheel')
  if (type === 'diamond') return t('luckyWheel.diamondWheel')
  return type
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 显示提示
const showTipMessage = (msg) => {
  tipMessage.value = msg
  showTip.value = true
}

// 开始抽奖
const startSpin = async () => {
  if (isSpinning.value) return
  
  // 检查钱包连接
  if (!walletStore.isConnected) {
    showTipMessage(t('invite.connectWalletFirst'))
    return
  }

  // 检查幸运值
  if (!canSpin.value) {
    showTipMessage(t('luckyWheel.insufficientPointsDetail', { need: currentRequiredPoints.value, current: userLuckyPoints.value }))
    return
  }
  
  isSpinning.value = true
  
  try {
    // 调用后端抽奖API
    const response = await fetch('/api/lucky-wheel/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        wheel_type: currentWheelType.value
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      const prize = data.data.prize
      
      // 根据中奖奖品ID计算精确停止角度
      const prizeId = prize.id || 6 // 默认五等奖
      const possibleSectors = prizeIdToSectors[prizeId] || [2, 6, 7]
      // 随机选择一个对应的扇区
      const sectorIndex = possibleSectors[Math.floor(Math.random() * possibleSectors.length)]
      
      // 每个扇区 45 度，扇区中心偏移 22.5 度
      // 要让扇区 n 停在指针下（顶部0度位置），转盘需要转到 360 - (22.5 + n * 45) 度
      const sectorCenterAngle = 22.5 + sectorIndex * 45
      const stopAngle = 360 - sectorCenterAngle
      
      // 加入小范围随机偏移，让停止位置更自然（±15度内）
      const randomOffset = (Math.random() - 0.5) * 30
      
      const extraRotations = 360 * 6 // 转6圈
      const targetAngle = extraRotations + stopAngle + randomOffset
      
      // 确保转盘总是顺时针转动（角度递增）
      const currentRotation = wheelRotation.value % 360
      wheelRotation.value = wheelRotation.value - currentRotation + targetAngle + 360
      
      console.log(`[LuckyWheel] 中奖: ${prize.name}, prizeId: ${prizeId}, 扇区: ${sectorIndex}, 停止角度: ${stopAngle.toFixed(1)}°`)
      
      // 等待动画完成后显示结果
      setTimeout(() => {
        isSpinning.value = false
        resultPrize.value = prize
        showResult.value = true
        userLuckyPoints.value = data.data.remainingPoints
        
        // 刷新记录
        fetchMyRecords()
        fetchAnnouncements()
      }, 4000)
      
    } else {
      isSpinning.value = false
      showTipMessage(data.message || t('luckyWheel.spinFailed'))
    }
    
  } catch (error) {
    console.error('[LuckyWheel] 抽奖失败:', error)
    isSpinning.value = false
    showTipMessage(t('luckyWheel.spinFailed'))
  }
}

// 关闭弹窗
const closePopup = () => {
  if (!isSpinning.value) {
    emit('close')
    emit('update:visible', false)
  }
}

// 关闭结果弹窗
const closeResult = () => {
  showResult.value = false
  resultPrize.value = null
}

// 获取用户幸运值
const fetchLuckyPoints = async () => {
  if (!walletStore.isConnected) return
  
  try {
    const response = await fetch(`/api/lucky-wheel/points?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      userLuckyPoints.value = data.data.luckyPoints
    }
  } catch (error) {
    console.error('[LuckyWheel] 获取幸运值失败:', error)
  }
}

// 获取获奖公告
const fetchAnnouncements = async () => {
  try {
    const response = await fetch('/api/lucky-wheel/announcements?limit=50')
    const data = await response.json()
    
    if (data.success) {
      announcements.value = data.data
    }
  } catch (error) {
    console.error('[LuckyWheel] 获取公告失败:', error)
  }
}

// 获取我的抽奖记录
const fetchMyRecords = async () => {
  if (!walletStore.isConnected) return
  
  try {
    const response = await fetch(`/api/lucky-wheel/records?wallet_address=${walletStore.walletAddress}&limit=20`)
    const data = await response.json()
    
    if (data.success) {
      myRecords.value = data.data
    }
  } catch (error) {
    console.error('[LuckyWheel] 获取记录失败:', error)
  }
}

// 公告滚动动画
const announcementsRef = ref(null)
let scrollInterval = null

const startAnnouncementScroll = () => {
  if (scrollInterval) clearInterval(scrollInterval)
  
  scrollInterval = setInterval(() => {
    if (announcementsRef.value && activeTab.value === 'announcements') {
      const container = announcementsRef.value
      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        container.scrollTop = 0
      } else {
        container.scrollTop += 1
      }
    }
  }, 50)
}

// 监听弹窗显示
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchLuckyPoints()
    fetchAnnouncements()
    fetchMyRecords()
    startAnnouncementScroll()
  } else {
    if (scrollInterval) {
      clearInterval(scrollInterval)
      scrollInterval = null
    }
  }
})

onMounted(() => {
  if (props.visible) {
    fetchLuckyPoints()
    fetchAnnouncements()
    fetchMyRecords()
    startAnnouncementScroll()
  }
})

onUnmounted(() => {
  if (scrollInterval) {
    clearInterval(scrollInterval)
  }
})
</script>

<style scoped>
/* 弹窗遮罩 */
.lucky-wheel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗主体 */
.lucky-wheel-popup {
  width: 92%;
  max-width: 400px;
  max-height: 88vh;
  background: linear-gradient(180deg, #1a2744 0%, #0d1a2d 100%);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow-y: auto;
  border: 1px solid rgba(66, 165, 245, 0.3);
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
}

/* 转盘容器 */
.wheel-container {
  text-align: center;
  margin-bottom: 12px;
}

.wheel-type-label {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

/* 转盘包装器 */
.wheel-wrapper {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 0 auto;
}

/* 转盘指针 */
.wheel-pointer {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.pointer-arrow {
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 24px solid #ffd700;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

/* 转盘主体 */
.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  background: conic-gradient(
    #1e88e5 0deg 45deg,
    #42a5f5 45deg 90deg,
    #1e88e5 90deg 135deg,
    #42a5f5 135deg 180deg,
    #1e88e5 180deg 225deg,
    #42a5f5 225deg 270deg,
    #1e88e5 270deg 315deg,
    #42a5f5 315deg 360deg
  );
  border: 6px solid #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 30px rgba(0,0,0,0.3);
  transition: none;
}

.wheel.spinning {
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

/* 转盘奖品通用样式 */
.prize-item {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 50px;
  height: 45px;
  pointer-events: none;
}

.prize-icon {
  font-size: 16px;
  line-height: 1;
}

.prize-text {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
  line-height: 1;
}

.prize-unit {
  font-size: 10px;
  color: #ffd700;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
  line-height: 1;
}

/* 8个奖品的精确位置 - 转盘260px，半径130px，奖品距圆心80px */
/* 每个扇区45度，扇区中心: 22.5°, 67.5°, 112.5°, 157.5°, 202.5°, 247.5°, 292.5°, 337.5° */

/* 扇区0: 22.5° - 1 BTC */
.prize-0 {
  top: 18%;
  left: 62%;
  transform: translate(-50%, -50%) rotate(22.5deg);
}

/* 扇区1: 67.5° - 200 USDT */
.prize-1 {
  top: 38%;
  left: 82%;
  transform: translate(-50%, -50%) rotate(67.5deg);
}

/* 扇区2: 112.5° - 5 WLD */
.prize-2 {
  top: 62%;
  left: 82%;
  transform: translate(-50%, -50%) rotate(112.5deg);
}

/* 扇区3: 157.5° - 100 USDT */
.prize-3 {
  top: 82%;
  left: 62%;
  transform: translate(-50%, -50%) rotate(157.5deg);
}

/* 扇区4: 202.5° - 50 WLD */
.prize-4 {
  top: 82%;
  left: 38%;
  transform: translate(-50%, -50%) rotate(202.5deg);
}

/* 扇区5: 247.5° - 30 WLD */
.prize-5 {
  top: 62%;
  left: 18%;
  transform: translate(-50%, -50%) rotate(247.5deg);
}

/* 扇区6: 292.5° - 5 WLD */
.prize-6 {
  top: 38%;
  left: 18%;
  transform: translate(-50%, -50%) rotate(292.5deg);
}

/* 扇区7: 337.5° - 5 WLD */
.prize-7 {
  top: 18%;
  left: 38%;
  transform: translate(-50%, -50%) rotate(337.5deg);
}

/* 中心抽奖按钮 */
.spin-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
}

.spin-btn:hover:not(.disabled) {
  transform: translate(-50%, -50%) scale(1.05);
}

.spin-btn:active:not(.disabled) {
  transform: translate(-50%, -50%) scale(0.95);
}

.spin-btn.disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: linear-gradient(135deg, #888 0%, #666 100%);
}

.spin-text {
  font-size: 12px;
  font-weight: bold;
  color: #1a2744;
  text-align: center;
  line-height: 1.2;
}

/* 转盘类型选择 */
.wheel-types {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.wheel-type-btn {
  flex: 1;
  padding: 8px 4px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #90caf9;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.wheel-type-btn.active {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border-color: #ffd700;
  color: #1a2744;
}

.type-name {
  font-size: 13px;
  font-weight: 600;
}

.type-points {
  font-size: 10px;
  opacity: 0.9;
}

/* 幸运值显示 */
.lucky-points-info {
  text-align: center;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.points-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.points-value {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  margin: 0 6px;
}

.points-need {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.tab-btn {
  flex: 1;
  padding: 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  position: relative;
}

.tab-btn.active {
  color: #ffd700;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: #ffd700;
}

/* 公告容器 */
.announcements-container {
  height: 100px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px;
}

.announcements-scroll {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.announcements-scroll::-webkit-scrollbar {
  display: none;
}

.announcement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.announcement-item .wallet {
  flex: 1;
  color: #90caf9;
}

.announcement-item .prize {
  flex: 0.8;
  text-align: center;
  color: #ffd700;
}

.announcement-item .reward {
  flex: 0.8;
  text-align: right;
  color: #4caf50;
}

/* 记录容器 */
.records-container {
  max-height: 120px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px;
}

.empty-records {
  text-align: center;
  padding: 25px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.record-prize {
  font-size: 12px;
  color: #ffd700;
}

.record-wheel {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.record-reward {
  font-size: 13px;
  font-weight: bold;
  color: #4caf50;
}

.record-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

/* 中奖结果弹窗 */
.result-overlay,
.tip-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.result-popup,
.tip-popup {
  background: linear-gradient(135deg, #1a2a4a 0%, #0a1628 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  border: 2px solid #ffd700;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
  animation: popIn 0.3s ease;
  min-width: 260px;
}

@keyframes popIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.result-title {
  font-size: 18px;
  color: #ffd700;
  margin-bottom: 12px;
}

.result-prize {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.result-reward {
  font-size: 24px;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 16px;
}

.result-btn,
.tip-btn {
  padding: 10px 36px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: #1a2744;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.tip-content {
  font-size: 14px;
  color: #fff;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* 移动端适配 */
@media (max-width: 400px) {
  .lucky-wheel-popup {
    padding: 12px;
  }
  
  .wheel-wrapper {
    width: 230px;
    height: 230px;
  }
  
  .spin-btn {
    width: 70px;
    height: 70px;
  }
  
  .spin-text {
    font-size: 11px;
  }
  
  .prize-item {
    width: 42px;
    height: 38px;
  }
  
  .prize-icon {
    font-size: 14px;
  }
  
  .prize-text {
    font-size: 12px;
  }
  
  .prize-unit {
    font-size: 9px;
  }
}
</style>
