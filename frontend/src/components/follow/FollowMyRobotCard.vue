<template>
  <!-- 
    Follow页面 - 我的机器人卡片组件
    
    功能说明：
    - Grid机器人：每天量化返利，到期退回本金
    - High机器人：只量化一次，到期返还本金+利息
    
    Props:
    - robot: 机器人购买记录对象（来自数据库）
    - isQuantifying: 是否正在执行量化操作
    - quantifiedToday: 今天是否已经量化过（Grid机器人）
    - isQuantified: 是否已量化过（High机器人）
    - lastEarnings: 最近一次量化获得的收益
    
    Events:
    - quantify: 点击量化按钮时触发
  -->
  <div class="follow-robot-card" :class="{ 'high-robot': robot.robot_type === 'high' }">
    <!-- 机器人头部：Logo 和名称 -->
    <div class="robot-header">
      <img src="/static/CEX-Robots/图标.png" :alt="robot.robot_name" class="robot-logo" />
      <h3 class="robot-name">{{ robot.robot_name }}</h3>
      <!-- 机器人类型标签 -->
      <span class="robot-type-badge" :class="robot.robot_type">
        {{ robot.robot_type === 'high' ? 'High' : 'Grid' }}
      </span>
    </div>
    
    <!-- 机器人信息 -->
    <div class="robot-info">
      <!-- 投入本金 -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.principal') }}</span>
        <span class="info-value">{{ formatNumber(robot.price) }} USDT</span>
      </div>
      
      <!-- 日收益率 -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.dailyProfit') }}</span>
        <span class="info-value highlight">{{ robot.daily_profit }} %</span>
      </div>
      
      <!-- High机器人显示到期总回报 -->
      <div v-if="robot.robot_type === 'high'" class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.expectedReturn') }}</span>
        <span class="info-value profit">{{ formatNumber(robot.expected_return) }} USDT</span>
      </div>
      
      <!-- Grid机器人显示累计收益 -->
      <div v-else class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.totalProfit') }}</span>
        <span class="info-value profit">+{{ formatNumber(robot.total_profit) }} USDT</span>
      </div>
      
      <!-- 开始时间（使用 start_time 或 start_date） -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.startDate') }}</span>
        <span class="info-value">{{ formatDateTime(robot.start_time || robot.start_date) }}</span>
      </div>
      
      <!-- 结束时间（使用 end_time 或 end_date） -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.endDate') }}</span>
        <span class="info-value">{{ formatDateTime(robot.end_time || robot.end_date) }}</span>
      </div>
      
      <!-- 剩余时间（优先使用 hours_remaining，精确到小时） -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.remainingTime') || t('followPage.myRobot.remainingDays') }}</span>
        <span class="info-value">{{ formatRemainingTime(robot) }}</span>
      </div>
    </div>

    <!-- 机器人底部：状态和量化按钮 -->
    <div class="robot-footer">
      <!-- High机器人状态说明 -->
      <div v-if="robot.robot_type === 'high'" class="robot-status">
        <span class="status-dot" :class="{ 'quantified': isQuantified }"></span>
        <span v-if="isQuantified" class="status-text quantified">
          {{ t('followPage.myRobot.waitingMaturity') }}
        </span>
        <span v-else class="status-text pending">
          {{ t('followPage.myRobot.pendingQuantify') }}
        </span>
      </div>
      
      <!-- Grid机器人状态 -->
      <div v-else class="robot-status">
        <span class="status-dot" :class="{ 'quantified': quantifiedToday }"></span>
        <span v-if="quantifiedToday" class="status-text quantified">
          {{ t('followPage.myRobot.quantifiedToday') }}
        </span>
        <span v-else class="status-text pending">
          {{ t('followPage.myRobot.canQuantify') }}
        </span>
      </div>
      
      <!-- 量化按钮 -->
      <button 
        class="quantify-button"
        :class="{ 
          'disabled': (robot.robot_type === 'high' && isQuantified) || (robot.robot_type !== 'high' && quantifiedToday),
          'loading': isQuantifying 
        }"
        :disabled="(robot.robot_type === 'high' && isQuantified) || (robot.robot_type !== 'high' && quantifiedToday) || isQuantifying"
        @click="handleQuantify"
      >
        <span v-if="isQuantifying" class="loading-spinner"></span>
        <span v-else-if="robot.robot_type === 'high' && isQuantified">
          {{ t('followPage.myRobot.quantified') }}
        </span>
        <span v-else-if="robot.robot_type !== 'high' && quantifiedToday && countdown">
          {{ countdown }}
        </span>
        <span v-else-if="robot.robot_type !== 'high' && quantifiedToday">
          {{ t('followPage.myRobot.quantified') }}
        </span>
        <span v-else>
          {{ t('followPage.myRobot.quantify') }}
        </span>
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
              <span>{{ robot.daily_profit }}%</span>
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
          <div class="earnings-title">{{ t('followPage.myRobot.quantifySuccess') || 'Quantification Success!' }}</div>
          <div class="earnings-amount">+{{ formatNumber(displayEarnings) }} USDT</div>
          <div class="earnings-desc">
            {{ robot.robot_type === 'high' 
              ? t('followPage.myRobot.highRobotEarningsNote') || 'Profit will be returned at maturity'
              : t('followPage.myRobot.gridRobotEarningsNote') || 'Added to your balance' 
            }}
          </div>
          <button class="earnings-btn" @click="closeEarningsPopup">{{ t('common.confirm') || 'OK' }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * Follow页面我的机器人卡片组件
 * 用于显示用户购买的Grid和High机器人
 * 包含量化动画和收益显示功能
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 组件属性
const props = defineProps({
  // 机器人购买记录对象
  robot: {
    type: Object,
    required: true
  },
  // 是否正在量化
  isQuantifying: {
    type: Boolean,
    default: false
  },
  // Grid机器人：今天是否已量化（24小时内已量化）
  quantifiedToday: {
    type: Boolean,
    default: false
  },
  // High机器人：是否已量化过
  isQuantified: {
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

// 组件事件
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
        // Grid机器人显示收益弹窗
        if (props.robot.robot_type !== 'high' && displayEarnings.value > 0) {
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

/**
 * 格式化数字，添加千分位分隔符
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
const formatNumber = (num) => {
  if (!num) return '0.00'
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
}

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * 格式化日期时间（精确到小时分钟）
 * @param {string} dateTimeStr - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * 格式化剩余时间（优先使用 hours_remaining 字段）
 * @param {object} robot - 机器人对象
 * @returns {string} 格式化后的剩余时间
 */
const formatRemainingTime = (robot) => {
  // 优先使用 API 返回的 hours_remaining 字段
  if (robot.hours_remaining !== undefined && robot.hours_remaining !== null) {
    const hours = Number(robot.hours_remaining)
    if (hours <= 0) return t('common.expired') || 'Expired'
    
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
  if (!endTime) return '-'
  
  const endDate = new Date(endTime)
  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()
  
  if (diffMs <= 0) return t('common.expired') || 'Expired'
  
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

/**
 * 计算剩余天数（兼容旧代码）
 * @param {string} endDateStr - 结束日期
 * @returns {number} 剩余天数
 */
const calculateRemainingDays = (endDateStr) => {
  if (!endDateStr) return 0
  const endDate = new Date(endDateStr)
  const today = new Date()
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * 点击量化按钮
 */
const handleQuantify = () => {
  emit('quantify', props.robot)
}
</script>

<style scoped>
/* 机器人卡片容器 - 与商品卡片尺寸统一 */
.follow-robot-card {
  width: 100%;
  max-width: 350px; /* 与 robot-card 宽度一致 */
  background: linear-gradient(135deg, rgba(42, 42, 46, 0.9) 0%, rgba(31, 31, 35, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; /* 与 robot-card 圆角一致 */
  padding: 14px 18px 20px 18px; /* 与 robot-card 内边距一致 */
  margin: 0 auto 16px auto; /* 居中显示 */
  position: relative;
  overflow: hidden;
  min-height: 280px; /* 调整最小高度 */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* High机器人特殊样式 */
.follow-robot-card.high-robot {
  border-color: rgba(245, 182, 56, 0.3);
}

.follow-robot-card.high-robot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgb(245, 182, 56), transparent);
}

/* 机器人头部 */
.robot-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.robot-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 12px;
}

.robot-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: rgb(245, 182, 56);
  margin: 0;
}

/* 机器人类型标签 */
.robot-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.robot-type-badge.high {
  background: rgba(245, 182, 56, 0.2);
  color: rgb(245, 182, 56);
}

.robot-type-badge.grid {
  background: rgba(76, 175, 80, 0.2);
  color: rgb(76, 175, 80);
}

/* 机器人信息 */
.robot-info {
  margin-bottom: 16px;
  flex: 1; /* 占据剩余空间，确保底部对齐 */
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.info-value.highlight {
  color: rgb(245, 182, 56);
}

.info-value.profit {
  color: rgb(76, 175, 80);
}

/* 机器人底部 */
.robot-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.robot-status {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(76, 175, 80);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
  animation: pulse-green 2s infinite;
}

.status-dot.quantified {
  background: rgb(245, 182, 56);
  box-shadow: 0 0 8px rgba(245, 182, 56, 0.6);
  animation: pulse-gold 1.5s infinite;
}

@keyframes pulse-green {
  0%, 100% { 
    opacity: 1; 
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
  }
  50% { 
    opacity: 0.7; 
    box-shadow: 0 0 12px rgba(76, 175, 80, 0.8);
  }
}

@keyframes pulse-gold {
  0%, 100% { 
    opacity: 1; 
    box-shadow: 0 0 6px rgba(245, 182, 56, 0.5);
    transform: scale(1);
  }
  50% { 
    opacity: 0.8; 
    box-shadow: 0 0 12px rgba(245, 182, 56, 1);
    transform: scale(1.2);
  }
}

.status-text {
  font-size: 12px;
  font-weight: 500;
}

.status-text.quantified {
  color: rgba(255, 255, 255, 0.5);
}

.status-text.pending {
  color: rgb(76, 175, 80);
}

/* 量化按钮 */
.quantify-button {
  min-width: 100px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgb(245, 182, 56) 0%, rgb(255, 152, 0) 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quantify-button:hover:not(.disabled):not(.loading) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 182, 56, 0.4);
}

.quantify-button.disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
}

.quantify-button.loading {
  background: rgba(245, 182, 56, 0.5);
  cursor: wait;
}

/* 加载动画 */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
  background: rgba(245, 182, 56, 0.6);
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
  stroke: rgb(245, 182, 56);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 565.48;
  stroke-dashoffset: 565.48;
  transition: stroke-dashoffset 0.1s ease;
  filter: drop-shadow(0 0 10px rgba(245, 182, 56, 0.8));
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
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  margin-bottom: 8px;
}

.complete-text {
  font-size: 18px;
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
  background: linear-gradient(135deg, #f5b638 0%, #f59e0b 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  top: 5%;
  right: 15%;
  animation-delay: 0.5s;
  box-shadow: 0 0 15px rgba(245, 182, 56, 0.5);
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

/* 移动端适配 */
@media (max-width: 768px) {
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
    font-size: 16px;
  }

  .complete-text {
    font-size: 14px;
  }

  .earnings-text {
    font-size: 14px;
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

  .earnings-popup {
    margin: 0 20px;
    padding: 24px 32px;
  }

  .earnings-amount {
    font-size: 28px;
  }
}
</style>
