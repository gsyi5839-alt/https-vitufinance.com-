<template>
  <!-- 
    我的机器人卡片组件 - 用于 My Robot 标签页
    
    Props:
    - robot: 机器人购买记录对象（来自数据库）
    - isQuantifying: 是否正在执行量化操作
    - quantifiedToday: 今天是否已经量化过
    
    Events:
    - quantify: 点击量化按钮时触发
  -->
  <div class="my-robot-card">
    <!-- 机器人头部：Logo 和名称 -->
    <div class="robot-header">
      <img :src="getRobotLogo(robot.robot_name)" :alt="robot.robot_name" class="robot-logo" />
      <h3 class="robot-name">{{ robot.robot_name }}</h3>
    </div>
    
    <!-- 机器人信息 -->
    <div class="robot-info">
      <!-- 投入本金 -->
      <div class="info-row">
        <span class="info-label">{{ t('common.principal') }}</span>
        <span class="info-value">{{ formatNumber(robot.price) }} USDT</span>
      </div>
      <!-- 日收益率 -->
      <div class="info-row">
        <span class="info-label">{{ t('common.dailyRate') }}</span>
        <span class="info-value highlight">{{ robot.daily_profit }} %</span>
      </div>
      <!-- 累计收益 -->
      <div class="info-row">
        <span class="info-label">{{ t('common.totalProfit') }}</span>
        <span class="info-value profit">+{{ formatNumber(robot.total_profit) }} USDT</span>
      </div>
      <!-- 开始时间（使用 start_time 或 start_date） -->
      <div class="info-row">
        <span class="info-label">{{ t('common.startDate') }}</span>
        <span class="info-value">{{ formatDateTime(robot.start_time || robot.start_date) }}</span>
      </div>
      <!-- 结束时间（使用 end_time 或 end_date） -->
      <div class="info-row">
        <span class="info-label">{{ t('common.endDate') }}</span>
        <span class="info-value">{{ formatDateTime(robot.end_time || robot.end_date) }}</span>
      </div>
      <!-- 剩余时间（优先使用 hours_remaining，精确到小时） -->
      <div class="info-row">
        <span class="info-label">{{ t('common.remainingTime') || t('common.remainingDays') }}</span>
        <span class="info-value">{{ formatRemainingTime(robot) }}</span>
      </div>
    </div>

    <!-- 机器人底部：状态和量化按钮 -->
    <div class="robot-footer">
      <div class="robot-status">
        <span class="status-dot" :class="{ 'is-active': robot.status === 'active' }"></span>
        <span class="status-text">{{ robot.status === 'active' ? t('common.running') : t('common.stopped') }}</span>
      </div>
      <button 
        class="quantify-button" 
        :class="{ 
          'is-quantified': quantifiedToday || isExpired,
          'is-loading': isQuantifying,
          'is-expired': isExpired
        }"
        :disabled="!canQuantify"
        @click="handleQuantify"
      >
        <span v-if="isExpired">{{ t('common.expired') || '已到期' }}</span>
        <span v-else-if="quantifiedToday && countdown">{{ countdown }}</span>
        <span v-else-if="quantifiedToday">{{ t('common.quantified') }}</span>
        <span v-else>{{ t('common.quantify') }}</span>
      </button>
    </div>

    <!-- 量化动画遮罩层 -->
    <Teleport to="body">
      <div v-if="showQuantifyAnimation" class="quantify-overlay">
        <div class="quantify-animation-container">
          <!-- 外圈装饰圆点 -->
          <div class="outer-dots">
            <span v-for="i in 12" :key="i" class="dot" :style="{ '--i': i }"></span>
          </div>
          
          <!-- 进度环 -->
          <svg class="progress-ring" viewBox="0 0 200 200">
            <!-- 背景圆环 -->
            <circle 
              class="progress-ring-bg"
              cx="100" 
              cy="100" 
              r="90"
            />
            <!-- 进度圆环 -->
            <circle 
              class="progress-ring-progress"
              cx="100" 
              cy="100" 
              r="90"
              :style="{ 'stroke-dashoffset': progressOffset }"
            />
          </svg>
          
          <!-- 中心绿色圆 -->
          <div class="center-circle" :class="{ 'is-complete': isComplete }">
            <div class="center-content">
              <div v-if="!isComplete" class="quantify-text">{{ t('common.quantifying') }}</div>
              <div v-else class="complete-text">{{ t('common.quantifyComplete') }}</div>
              <div v-if="!isComplete" class="progress-percent">{{ Math.round(progress) }}%</div>
              <!-- 显示获得的收益 -->
              <div v-if="isComplete && displayEarnings > 0" class="earnings-text">
                +{{ formatNumber(displayEarnings) }} USDT
              </div>
            </div>
          </div>

          <!-- 小圆圈装饰 -->
          <div class="small-circles">
            <div class="small-circle circle-1">
              <span>{{ Math.round(robot.daily_profit * 10) }}</span>
            </div>
            <div class="small-circle circle-2">
              <span>{{ robot.daily_profit }}</span>
            </div>
            <div class="small-circle circle-3">
              <span>{{ calculateRemainingDays(robot.end_date) }}</span>
              <small>{{ t('common.days') }}</small>
            </div>
            <div class="small-circle circle-4">
              <span>{{ Math.round(parseFloat(robot.price) / 100) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 收益弹窗 -->
    <Teleport to="body">
      <div v-if="showEarningsPopup" class="earnings-popup-overlay" @click="closeEarningsPopup">
        <div class="earnings-popup" @click.stop>
          <div class="earnings-icon">🎉</div>
          <div class="earnings-title">{{ t('robotPage.quantifySuccessTitle') || 'Quantification Success!' }}</div>
          <div class="earnings-amount">+{{ formatNumber(displayEarnings) }} USDT</div>
          <div class="earnings-desc">{{ t('robotPage.quantifySuccessDesc') || 'Added to your balance' }}</div>
          <button class="earnings-btn" @click="closeEarningsPopup">{{ t('common.confirm') || '確認' }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * MyRobotCard 组件 - 显示用户已购买的机器人
 * 
 * 功能：
 * - 显示机器人详情（本金、收益率、累计收益等）
 * - 提供"量化"按钮，每天可点击一次获取收益
 * - 酷炫的量化动画效果
 */
import { ref, computed, watch } from 'vue'
// 注意：computed 用于计算是否到期和是否可量化
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 定义 Props
const props = defineProps({
  robot: {
    type: Object,
    required: true
  },
  isQuantifying: {
    type: Boolean,
    default: false
  },
  quantifiedToday: {
    type: Boolean,
    default: false
  },
  // 最近一次量化获得的收益
  lastEarnings: {
    type: Number,
    default: 0
  },
  // 下次可量化时间（ISO字符串）
  nextQuantifyTime: {
    type: String,
    default: ''
  },
  // 剩余小时数
  hoursRemaining: {
    type: Number,
    default: 0
  }
})

// 定义 Events
const emit = defineEmits(['quantify', 'animationComplete'])

// 倒计时显示
const countdown = ref('')
let countdownTimer = null

// 格式化倒计时显示
const formatCountdown = (hoursRemaining) => {
  if (!hoursRemaining || hoursRemaining <= 0) return ''
  const hours = Math.floor(hoursRemaining)
  const minutes = Math.floor((hoursRemaining % 1) * 60)
  return `${hours}h ${minutes}m`
}

// 更新倒计时
const updateCountdown = () => {
  if (props.nextQuantifyTime) {
    const nextTime = new Date(props.nextQuantifyTime)
    const now = new Date()
    const diff = nextTime - now
    
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      countdown.value = `${hours}h ${minutes}m`
    } else {
      countdown.value = ''
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  } else if (props.hoursRemaining > 0) {
    countdown.value = formatCountdown(props.hoursRemaining)
  } else {
    countdown.value = ''
  }
}

// 监听 nextQuantifyTime 变化
watch(() => props.nextQuantifyTime, (newVal) => {
  if (newVal) {
    updateCountdown()
    // 启动定时器每分钟更新一次
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(updateCountdown, 60000)
  } else {
    countdown.value = ''
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }
}, { immediate: true })

// 监听 hoursRemaining 变化
watch(() => props.hoursRemaining, (newVal) => {
  if (newVal > 0) {
    updateCountdown()
    // 如果没有启动定时器，启动它
    if (!countdownTimer) {
      countdownTimer = setInterval(updateCountdown, 60000)
    }
  }
}, { immediate: true })

// 量化动画状态
const showQuantifyAnimation = ref(false)
const progress = ref(0)
const isComplete = ref(false)
const displayEarnings = ref(0)
const showEarningsPopup = ref(false)

// 进度环周长
const circumference = 2 * Math.PI * 90

// 计算进度偏移量
const progressOffset = computed(() => {
  return circumference - (progress.value / 100) * circumference
})

// 监听量化状态
watch(() => props.isQuantifying, (newVal) => {
  if (newVal) {
    // 开始量化动画
    showQuantifyAnimation.value = true
    progress.value = 0
    isComplete.value = false
    startProgressAnimation()
  }
})

// 监听收益变化
watch(() => props.lastEarnings, (newVal) => {
  if (newVal > 0) {
    displayEarnings.value = newVal
  }
})

// 进度动画
const startProgressAnimation = () => {
  const duration = 3000 // 3秒完成
  const startTime = performance.now()
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progressValue = Math.min((elapsed / duration) * 100, 100)
    progress.value = progressValue
    
    if (progressValue < 100) {
      requestAnimationFrame(animate)
    } else {
      // 动画完成，通知父组件可以显示结果了
      isComplete.value = true
      emit('animationComplete', props.robot.id)
      // 计算预期收益用于显示
      if (displayEarnings.value === 0) {
        const dailyProfitRate = parseFloat(props.robot.daily_profit) / 100
        displayEarnings.value = parseFloat(props.robot.price) * dailyProfitRate
      }
      // 1.5秒后关闭动画，显示收益弹窗
      setTimeout(() => {
        showQuantifyAnimation.value = false
        isComplete.value = false
        progress.value = 0
        // 显示收益弹窗
        if (displayEarnings.value > 0) {
          showEarningsPopup.value = true
        }
      }, 1500)
    }
  }
  
  requestAnimationFrame(animate)
}

// 关闭收益弹窗
const closeEarningsPopup = () => {
  showEarningsPopup.value = false
  displayEarnings.value = 0
}

// 机器人 Logo 映射
const robotLogos = {
  'Binance Ai Bot': '/static/CEX-Robots/图标.png',
  'Coinbase Ai Bot': '/static/CEX-Robots/3.png',
  'OKX Ai Bot': '/static/CEX-Robots/6.png',
  'Bybit Ai Bot': '/static/CEX-Robots/5.png',
  'Upbit Ai Bot': '/static/CEX-Robots/7.png',
  'Bitfinex Ai Bot': '/static/CEX-Robots/2.png',
  'Kucoin Ai Bot': '/static/CEX-Robots/15.png',
  'Bitget Ai Bot': '/static/CEX-Robots/14.png',
  'Gate Ai Bot': '/static/CEX-Robots/9.png',
  'Binance Ai Bot-01': '/static/CEX-Robots/图标.png',
  'PancakeSwap Ai Bot': '/static/DEX-Robots/1.png',
  'Uniswap Ai Bot': '/static/DEX-Robots/2.png',
  'BaseSwap Ai Bot': '/static/DEX-Robots/3.png',
  'SushiSwap Ai Bot': '/static/DEX-Robots/4.png',
  'Jupiter Ai Bot': '/static/DEX-Robots/5.png',
  'Curve Ai Bot': '/static/DEX-Robots/6.png',
  'DODO Ai Bot': '/static/DEX-Robots/7.png'
}

// 获取机器人 Logo
const getRobotLogo = (robotName) => {
  return robotLogos[robotName] || '/static/CEX-Robots/图标.png'
}

// 格式化数字
const formatNumber = (num) => {
  const value = parseFloat(num) || 0
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化日期时间（精确到小时分钟）
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '--'
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return '--'
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化剩余时间（优先使用 hours_remaining 字段）
const formatRemainingTime = (robot) => {
  // 优先使用 API 返回的 hours_remaining 字段
  if (robot.hours_remaining !== undefined && robot.hours_remaining !== null) {
    const hours = Number(robot.hours_remaining)
    if (hours <= 0) return t('common.expired') || '已到期'
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.floor(hours % 24)
      if (remainingHours > 0) {
        return `${days} ${t('common.days')} ${remainingHours}h`
      }
      return `${days} ${t('common.days')}`
    }
    return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`
  }
  
  // 回退到使用 end_time 或 end_date 计算
  const endTime = robot.end_time || robot.end_date
  if (!endTime) return '--'
  
  const endDate = new Date(endTime)
  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()
  
  if (diffMs <= 0) return t('common.expired') || '已到期'
  
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24)
    const hours = Math.floor(diffHours % 24)
    if (hours > 0) {
      return `${days} ${t('common.days')} ${hours}h`
    }
    return `${days} ${t('common.days')}`
  }
  
  const hours = Math.floor(diffHours)
  const minutes = Math.floor((diffHours % 1) * 60)
  return `${hours}h ${minutes}m`
}

// 计算剩余天数（兼容旧代码）
const calculateRemainingDays = (endDateStr) => {
  if (!endDateStr) return 0
  const endDate = new Date(endDateStr)
  const today = new Date()
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// 检查机器人是否已到期（使用 end_time 精确判断，精确到秒）
const isExpired = computed(() => {
  // 优先使用 end_time
  const endTime = props.robot.end_time || props.robot.end_date
  if (!endTime) return false
  
  const endDate = new Date(endTime)
  const now = new Date()
  
  // 精确到秒判断
  return endDate.getTime() <= now.getTime()
})

// 判断是否可以量化
const canQuantify = computed(() => {
  // 如果已到期，不能量化
  if (isExpired.value) return false
  // 如果今天已量化，不能量化
  if (props.quantifiedToday) return false
  // 如果正在量化，不能量化
  if (props.isQuantifying) return false
  return true
})

// 点击量化按钮
const handleQuantify = () => {
  if (canQuantify.value) {
    emit('quantify', props.robot)
  }
}
</script>

<style scoped>
.my-robot-card {
  width: 100%;
  max-width: 350px;
  background: linear-gradient(135deg, #2a2a2e 0%, #1f1f23 100%);
  border: 1px solid rgba(245, 182, 56, 0.3);
  border-radius: 12px;
  padding: 16px 18px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-robot-card:hover {
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 182, 56, 0.5);
}

.robot-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.robot-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: contain;
  background: transparent;
}

.robot-name {
  font-size: 16px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0;
}

.robot-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.info-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}

.info-value.highlight {
  color: rgb(245, 182, 56);
}

.info-value.profit {
  color: rgb(51, 190, 135);
  font-weight: 600;
}

.robot-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.robot-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(128, 128, 128);
}

.status-dot.is-active {
  background: rgb(51, 190, 135);
  box-shadow: 0 0 8px rgba(51, 190, 135, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 量化按钮 */
.quantify-button {
  min-width: 90px;
  height: 34px;
  background: rgb(245, 182, 56);
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #000;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantify-button:hover:not(.is-quantified):not(.is-loading) {
  background: rgb(255, 192, 66);
  transform: translateY(-1px);
}

.quantify-button:active:not(.is-quantified):not(.is-loading) {
  transform: translateY(0);
}

.quantify-button.is-quantified {
  background: rgb(80, 80, 80);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
}

/* 已到期按钮样式 */
.quantify-button.is-expired {
  background: rgb(100, 60, 60);
  color: rgba(255, 200, 200, 0.7);
  cursor: not-allowed;
}

.quantify-button.is-loading {
  background: rgb(200, 160, 56);
  cursor: wait;
}

/* ==================== 量化动画样式 ==================== */
.quantify-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.95);
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

.quantify-animation-container {
  position: relative;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 外圈装饰圆点 */
.outer-dots {
  position: absolute;
  width: 280px;
  height: 280px;
  animation: rotateDots 20s linear infinite;
}

@keyframes rotateDots {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.outer-dots .dot {
  position: absolute;
  width: 6px;
  height: 6px;
  background: rgba(74, 222, 180, 0.6);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  transform: rotate(calc(30deg * var(--i))) translateX(140px);
  animation: dotPulse 2s ease-in-out infinite;
  animation-delay: calc(0.1s * var(--i));
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.3; transform: rotate(calc(30deg * var(--i))) translateX(140px) scale(0.8); }
  50% { opacity: 1; transform: rotate(calc(30deg * var(--i))) translateX(140px) scale(1.2); }
}

/* 进度环 */
.progress-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.progress-ring-progress {
  fill: none;
  stroke: #ef4444;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 565.48;
  stroke-dashoffset: 565.48;
  transition: stroke-dashoffset 0.1s ease;
  filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.8));
}

/* 中心绿色圆 */
.center-circle {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 0 30px rgba(74, 222, 128, 0.5),
    0 0 60px rgba(74, 222, 128, 0.3),
    inset 0 0 30px rgba(255, 255, 255, 0.2);
  animation: breathe 2s ease-in-out infinite;
  transition: all 0.5s ease;
}

.center-circle.is-complete {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
  box-shadow: 
    0 0 40px rgba(34, 197, 94, 0.6),
    0 0 80px rgba(34, 197, 94, 0.4),
    inset 0 0 30px rgba(255, 255, 255, 0.3);
  animation: completeGlow 0.5s ease forwards;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes completeGlow {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.center-content {
  text-align: center;
  color: #fff;
}

.quantify-text {
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  margin-bottom: 8px;
}

.complete-text {
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s ease;
}

.earnings-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  margin-top: 8px;
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.progress-percent {
  font-size: 28px;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* 小圆圈装饰 */
.small-circles {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.small-circle {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  animation: floatCircle 3s ease-in-out infinite;
}

.small-circle span {
  font-size: 14px;
  line-height: 1;
}

.small-circle small {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.8;
}

.circle-1 {
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  top: 10%;
  left: 5%;
  animation-delay: 0s;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
}

.circle-2 {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  top: 5%;
  right: 15%;
  animation-delay: 0.5s;
  box-shadow: 0 0 15px rgba(249, 115, 22, 0.5);
}

.circle-3 {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  top: 20%;
  right: 0%;
  animation-delay: 1s;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
}

.circle-4 {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  bottom: 15%;
  right: 5%;
  animation-delay: 1.5s;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
}

@keyframes floatCircle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .my-robot-card {
    padding: 14px 16px;
  }
  
  .quantify-button {
    min-width: 80px;
    height: 32px;
    font-size: 13px;
  }

  .quantify-animation-container {
    width: 260px;
    height: 260px;
  }

  .outer-dots {
    width: 240px;
    height: 240px;
  }

  .outer-dots .dot {
    transform: rotate(calc(30deg * var(--i))) translateX(120px);
  }

  @keyframes dotPulse {
    0%, 100% { opacity: 0.3; transform: rotate(calc(30deg * var(--i))) translateX(120px) scale(0.8); }
    50% { opacity: 1; transform: rotate(calc(30deg * var(--i))) translateX(120px) scale(1.2); }
  }

  .progress-ring {
    width: 170px;
    height: 170px;
  }

  .center-circle {
    width: 130px;
    height: 130px;
  }

  .quantify-text {
    font-size: 18px;
  }

  .complete-text {
    font-size: 16px;
  }

  .progress-percent {
    font-size: 24px;
  }

  .circle-1 { width: 38px; height: 38px; }
  .circle-2 { width: 34px; height: 34px; }
  .circle-3 { width: 42px; height: 42px; }
  .circle-4 { width: 36px; height: 36px; }

  .small-circle span {
    font-size: 12px;
  }

  .small-circle small {
    font-size: 8px;
  }
}

/* ==================== 收益弹窗样式 ==================== */
.earnings-popup-overlay {
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
  animation: fadeIn 0.3s ease;
}

.earnings-popup {
  background: linear-gradient(135deg, #2a2a2e 0%, #1f1f23 100%);
  border: 1px solid rgba(245, 182, 56, 0.3);
  border-radius: 20px;
  padding: 32px 40px;
  text-align: center;
  animation: popupScale 0.3s ease;
  min-width: 280px;
}

@keyframes popupScale {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.earnings-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.earnings-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.earnings-amount {
  font-size: 32px;
  font-weight: 700;
  color: rgb(76, 175, 80);
  margin-bottom: 8px;
}

.earnings-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
}

.earnings-btn {
  min-width: 120px;
  padding: 12px 32px;
  background: linear-gradient(135deg, rgb(245, 182, 56) 0%, rgb(255, 152, 0) 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.earnings-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 182, 56, 0.4);
}

/* 移动端收益弹窗适配 */
@media (max-width: 768px) {
  .earnings-popup {
    margin: 0 20px;
    padding: 24px 32px;
    min-width: auto;
    width: calc(100% - 40px);
    max-width: 300px;
  }

  .earnings-amount {
    font-size: 28px;
  }
}
</style>
