<template>
  <!-- 
    Follow页面 - 过期机器人卡片组件
    
    Props:
    - robot: 过期的机器人购买记录对象（来自数据库）
  -->
  <div class="expired-robot-card" :class="{ 'high-robot': robot.robot_type === 'high' }">
    <!-- 机器人头部 -->
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
      
      <!-- High机器人显示到期返还 -->
      <div v-if="robot.robot_type === 'high'" class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.returnedAmount') }}</span>
        <span class="info-value profit">{{ formatNumber(robot.expected_return) }} USDT</span>
      </div>
      
      <!-- Grid机器人显示累计收益 -->
      <div v-else class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.totalProfit') }}</span>
        <span class="info-value profit">+{{ formatNumber(robot.total_profit) }} USDT</span>
      </div>
      
      <!-- 运行周期（使用 start_time/end_time 或 start_date/end_date） -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.period') }}</span>
        <span class="info-value">{{ formatDateTime(robot.start_time || robot.start_date) }} - {{ formatDateTime(robot.end_time || robot.end_date) }}</span>
      </div>
      <!-- 实际运行时长 -->
      <div class="info-row">
        <span class="info-label">{{ t('followPage.myRobot.duration') || '运行时长' }}</span>
        <span class="info-value">{{ formatDuration(robot) }}</span>
      </div>
    </div>

    <!-- 过期状态标签 -->
    <div class="expired-badge">
      {{ t('followPage.myRobot.expired') }}
    </div>
  </div>
</template>

<script setup>
/**
 * Follow页面过期机器人卡片组件
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 组件属性
defineProps({
  robot: {
    type: Object,
    required: true
  }
})

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
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * 格式化日期时间（精确到小时分钟）
 */
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return '-'
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) + ' ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * 格式化运行时长
 */
const formatDuration = (robot) => {
  // 优先使用 duration_hours 字段
  if (robot.duration_hours) {
    const hours = Number(robot.duration_hours)
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      if (remainingHours > 0) {
        return `${days} ${t('common.days')} ${remainingHours}h`
      }
      return `${days} ${t('common.days')}`
    }
    return `${hours}h`
  }
  
  // 回退到计算
  const startTime = robot.start_time || robot.start_date
  const endTime = robot.end_time || robot.end_date
  if (!startTime || !endTime) return '-'
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffHours = (end - start) / (1000 * 60 * 60)
  
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24)
    return `${days} ${t('common.days')}`
  }
  return `${Math.floor(diffHours)}h`
}
</script>

<style scoped>
/* 过期机器人卡片 - 与商品卡片尺寸统一 */
.expired-robot-card {
  width: 100%;
  max-width: 350px; /* 与 robot-card 宽度一致 */
  background: linear-gradient(135deg, rgba(42, 42, 46, 0.6) 0%, rgba(31, 31, 35, 0.6) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px; /* 与 robot-card 圆角一致 */
  padding: 14px 18px 20px 18px; /* 与 robot-card 内边距一致 */
  margin: 0 auto 16px auto; /* 居中显示 */
  position: relative;
  opacity: 0.7;
  box-sizing: border-box;
}

.expired-robot-card.high-robot {
  border-color: rgba(245, 182, 56, 0.15);
}

/* 机器人头部 */
.robot-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.robot-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  filter: grayscale(30%);
}

.robot-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: rgba(245, 182, 56, 0.7);
  margin: 0;
}

/* 机器人类型标签 */
.robot-type-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  opacity: 0.6;
}

.robot-type-badge.high {
  background: rgba(245, 182, 56, 0.15);
  color: rgb(245, 182, 56);
}

.robot-type-badge.grid {
  background: rgba(76, 175, 80, 0.15);
  color: rgb(76, 175, 80);
}

/* 机器人信息 */
.robot-info {
  margin-bottom: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.info-value.profit {
  color: rgba(76, 175, 80, 0.8);
}

/* 过期标签 */
.expired-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(244, 67, 54, 0.2);
  color: rgb(244, 67, 54);
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}
</style>

