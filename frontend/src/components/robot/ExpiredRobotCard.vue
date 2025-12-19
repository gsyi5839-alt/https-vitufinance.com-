<template>
  <!-- 
    过期机器人卡片组件 - 用于 Expired Robot 标签页
    
    Props:
    - robot: 机器人购买记录对象（来自数据库）
  -->
  <div class="expired-robot-card">
    <!-- 机器人头部：Logo 和名称 -->
    <div class="robot-header">
      <img :src="getRobotLogo(robot.robot_name)" :alt="robot.robot_name" class="robot-logo" />
      <h3 class="robot-name">{{ robot.robot_name }}</h3>
      <span class="expired-badge">已过期</span>
    </div>
    
    <!-- 机器人信息 -->
    <div class="robot-info">
      <!-- 投入本金 -->
      <div class="info-row">
        <span class="info-label">投入本金</span>
        <span class="info-value">{{ formatNumber(robot.price) }} USDT</span>
      </div>
      <!-- 累计收益 -->
      <div class="info-row">
        <span class="info-label">累计收益</span>
        <span class="info-value profit">+{{ formatNumber(robot.total_profit) }} USDT</span>
      </div>
      <!-- 运行周期（使用 start_time/end_time 或 start_date/end_date） -->
      <div class="info-row">
        <span class="info-label">运行周期</span>
        <span class="info-value">{{ formatDateTime(robot.start_time || robot.start_date) }} ~ {{ formatDateTime(robot.end_time || robot.end_date) }}</span>
      </div>
      <!-- 实际运行时长 -->
      <div class="info-row">
        <span class="info-label">运行时长</span>
        <span class="info-value">{{ formatDuration(robot) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ExpiredRobotCard 组件 - 显示用户已过期的机器人
 */

// 定义 Props
const props = defineProps({
  robot: {
    type: Object,
    required: true
  }
})

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
    month: '2-digit',
    day: '2-digit'
  }) + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化运行时长
const formatDuration = (robot) => {
  // 优先使用 duration_hours 字段
  if (robot.duration_hours) {
    const hours = Number(robot.duration_hours)
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      if (remainingHours > 0) {
        return `${days}天 ${remainingHours}小时`
      }
      return `${days}天`
    }
    return `${hours}小时`
  }
  
  // 回退到计算
  const startTime = robot.start_time || robot.start_date
  const endTime = robot.end_time || robot.end_date
  if (!startTime || !endTime) return '--'
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffHours = (end - start) / (1000 * 60 * 60)
  
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24)
    return `${days}天`
  }
  return `${Math.floor(diffHours)}小时`
}
</script>

<style scoped>
.expired-robot-card {
  width: 100%;
  max-width: 350px;
  background: linear-gradient(135deg, #252528 0%, #1a1a1d 100%);
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 12px;
  padding: 16px 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0.8;
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
  filter: grayscale(50%);
}

.robot-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  flex: 1;
}

.expired-badge {
  background: rgba(128, 128, 128, 0.3);
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
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
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.info-value.profit {
  color: rgb(100, 180, 130);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .expired-robot-card {
    padding: 14px 16px;
  }
}
</style>

