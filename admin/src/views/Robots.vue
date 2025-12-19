<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>机器人购买记录</h2>
      <p class="description">查看用户的机器人购买记录（活跃和历史）</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeCount }}</div>
            <div class="stat-label">活跃机器人</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.expiredCount }}</div>
            <div class="stat-label">已过期</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalInvestment }}</div>
            <div class="stat-label">总投资 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayCount }}</div>
            <div class="stat-label">今日新增</div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 标签页切换 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="robot-tabs">
      <el-tab-pane label="活跃机器人" name="active">
        <template #label>
          <span>
            <el-icon><VideoPlay /></el-icon>
            活跃机器人
            <el-badge :value="stats.activeCount" :max="999" class="tab-badge" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane label="历史记录" name="expired">
        <template #label>
          <span>
            <el-icon><Clock /></el-icon>
            历史记录
            <el-badge :value="stats.expiredCount" :max="999" class="tab-badge" type="info" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane label="全部记录" name="all">
        <template #label>
          <span>
            <el-icon><List /></el-icon>
            全部记录
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
        <el-form-item label="钱包地址">
          <el-input
            v-model="searchForm.wallet_address"
            placeholder="请输入钱包地址"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="机器人类型">
          <el-select v-model="searchForm.robot_type" placeholder="全部" clearable style="width: 140px">
            <el-option label="CEX 机器人" value="cex" />
            <el-option label="DEX 机器人" value="dex" />
            <el-option label="网格交易" value="grid" />
            <el-option label="高频交易" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="robotList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="200">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyText(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="robot_name" label="机器人名称" width="150">
        <template #default="{ row }">
          <span class="robot-name">{{ row.robot_name || '-' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="robot_type" label="机器人类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getRobotTypeColor(row.robot_type)" size="small">
            {{ getRobotTypeName(row.robot_type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="price" label="购买价格" width="130" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.price) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="daily_profit" label="日收益率" width="100" align="center">
        <template #default="{ row }">
          <span class="rate positive">{{ row.daily_profit || 0 }}%</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="expected_return" label="预期收益" width="130" align="right">
        <template #default="{ row }">
          <span class="amount positive">{{ calculateExpectedReturn(row) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="current_status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.current_status === 'active' ? 'success' : 'info'" size="small">
            {{ row.current_status === 'active' ? '运行中' : '已过期' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="start_time" label="开始时间" width="170">
        <template #default="{ row }">
          <span class="datetime">{{ formatDateTime(row.start_time || row.start_date) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="end_time" label="到期时间" width="170">
        <template #default="{ row }">
          <span :class="['datetime', { 'expired-date': isExpiredByTime(row) }]">
            {{ formatDateTime(row.end_time || row.end_date) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="duration_hours" label="运行周期" width="100" align="center">
        <template #default="{ row }">
          <span class="duration">{{ formatDuration(row) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="hours_remaining" label="剩余时间" width="120" align="center">
        <template #default="{ row }">
          <span :class="['remaining', { 'warning': getRemainingHours(row) < 24, 'danger': getRemainingHours(row) <= 0 }]">
            {{ formatRemainingTime(row) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="is_quantified" label="量化状态" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-tooltip :content="row.robot_type === 'high' ? 'High机器人只需量化一次' : '今日量化状态'" placement="top">
            <el-tag :type="row.is_quantified ? 'success' : 'warning'" size="small">
              {{ row.is_quantified ? '已量化' : '未量化' }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * 机器人购买记录页面
 * 包含活跃和历史记录
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Monitor, Timer, Coin, Plus, VideoPlay, Clock, List } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getRobotPurchases } from '@/api'
import request from '@/api'

// 加载状态
const loading = ref(false)

// 当前标签
const activeTab = ref('active')

// 统计数据
const stats = reactive({
  activeCount: 0,
  expiredCount: 0,
  totalInvestment: '0.00',
  todayCount: 0
})

// 机器人列表
const robotList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: '',
  robot_type: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

/**
 * 获取统计数据
 */
const fetchStats = async () => {
  try {
    const res = await request.get('/robots/stats')
    if (res.success && res.data) {
      Object.assign(stats, res.data)
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

/**
 * 获取机器人购买记录
 */
const fetchRobots = async () => {
  loading.value = true
  try {
    const res = await getRobotPurchases({
      page: pagination.page,
      pageSize: pagination.pageSize,
      wallet_address: searchForm.wallet_address || undefined,
      robot_type: searchForm.robot_type || undefined,
      status: activeTab.value
    })
    
    if (res.success) {
      robotList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取机器人购买记录失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 标签切换
 */
const handleTabChange = () => {
  pagination.page = 1
  fetchRobots()
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchRobots()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.robot_type = ''
  pagination.page = 1
  fetchRobots()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchRobots()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchRobots()
}

/**
 * 复制文本
 */
const copyText = (text) => {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

/**
 * 缩短地址
 */
const shortenAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2)
}

/**
 * 计算预期收益
 * 公式：购买价格 * 日收益率 / 100 * 周期天数
 */
const calculateExpectedReturn = (row) => {
  // 如果数据库有预期收益且大于0，直接返回
  if (row.expected_return && parseFloat(row.expected_return) > 0) {
    return formatAmount(row.expected_return)
  }
  
  // 否则动态计算
  const price = parseFloat(row.price) || 0
  const dailyProfit = parseFloat(row.daily_profit) || 0
  
  // 计算周期天数（从开始日期到结束日期）
  let durationDays = 1
  if (row.start_date && row.end_date) {
    const start = dayjs(row.start_date)
    const end = dayjs(row.end_date)
    durationDays = end.diff(start, 'day') || 1
  }
  
  // 预期收益 = 价格 * 日收益率 / 100 * 天数
  const expectedReturn = price * dailyProfit / 100 * durationDays
  return formatAmount(expectedReturn)
}

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * 格式化日期时间（北京时间，精确到秒）
 * 服务器存储的是 UTC 时间，需要转换为北京时间（UTC+8）
 */
const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  // dayjs 会自动处理时区，显示本地时间（浏览器时区）
  // 如果服务器存储的是 UTC 时间，dayjs 会自动转换
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 检查是否已过期（使用 end_time 精确判断，精确到秒）
 */
const isExpired = (date) => {
  if (!date) return false
  return dayjs(date).isBefore(dayjs(), 'day')
}

/**
 * 检查是否已过期（使用 end_time 精确判断，精确到秒）
 */
const isExpiredByTime = (row) => {
  const endTime = row.end_time || row.end_date
  if (!endTime) return false
  return dayjs(endTime).isBefore(dayjs())
}

/**
 * 格式化运行周期（使用 duration_hours 字段）
 */
const formatDuration = (row) => {
  if (row.duration_hours) {
    const hours = parseInt(row.duration_hours)
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      if (remainingHours > 0) {
        return `${days}天${remainingHours}h`
      }
      return `${days}天`
    }
    return `${hours}h`
  }
  
  // 回退到使用 start/end 计算
  const startTime = row.start_time || row.start_date
  const endTime = row.end_time || row.end_date
  if (!startTime || !endTime) return '-'
  
  const diffHours = dayjs(endTime).diff(dayjs(startTime), 'hour')
  if (diffHours >= 24) {
    return `${Math.floor(diffHours / 24)}天`
  }
  return `${diffHours}h`
}

/**
 * 获取剩余小时数
 */
const getRemainingHours = (row) => {
  // 优先使用 API 返回的 hours_remaining 字段
  if (row.hours_remaining !== undefined && row.hours_remaining !== null) {
    return parseFloat(row.hours_remaining)
  }
  
  const endTime = row.end_time || row.end_date
  if (!endTime) return 0
  
  const diffMs = dayjs(endTime).diff(dayjs())
  return diffMs / (1000 * 60 * 60)
}

/**
 * 格式化剩余时间
 */
const formatRemainingTime = (row) => {
  const hours = getRemainingHours(row)
  
  if (hours <= 0) return '已到期'
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.floor(hours % 24)
    if (remainingHours > 0) {
      return `${days}天${remainingHours}h`
    }
    return `${days}天`
  }
  
  const h = Math.floor(hours)
  const m = Math.floor((hours % 1) * 60)
  return `${h}h ${m}m`
}

/**
 * 获取机器人类型颜色
 */
const getRobotTypeColor = (type) => {
  const colors = {
    'cex': 'primary',
    'dex': 'success',
    'grid': 'warning',
    'high': 'danger'
  }
  return colors[type] || 'info'
}

/**
 * 获取机器人类型名称
 */
const getRobotTypeName = (type) => {
  const names = {
    'cex': 'CEX 机器人',
    'dex': 'DEX 机器人',
    'grid': '网格交易',
    'high': '高频交易'
  }
  return names[type] || type
}

/**
 * 获取状态类型
 */
const getStatusType = (status) => {
  const types = {
    active: 'success',
    expired: 'info',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const texts = {
    active: '运行中',
    expired: '已到期',
    cancelled: '已取消'
  }
  return texts[status] || status
}

// 初始化
onMounted(() => {
  fetchStats()
  fetchRobots()
})
</script>

<style lang="scss" scoped>
.stats-row {
  margin-bottom: 20px;
}

.robot-tabs {
  margin-bottom: 20px;
  
  :deep(.el-tabs__item) {
    font-size: 14px;
    
    .el-icon {
      margin-right: 4px;
    }
    
    .tab-badge {
      margin-left: 8px;
      
      :deep(.el-badge__content) {
        height: 16px;
        line-height: 16px;
        padding: 0 5px;
        font-size: 10px;
      }
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  
  &:hover {
    color: #409EFF;
  }
}

.amount {
  font-weight: 600;
  
  &.positive {
    color: #67C23A;
  }
}

.rate {
  font-weight: 600;
  
  &.positive {
    color: #67C23A;
  }
}

.robot-name {
  font-weight: 500;
  color: var(--admin-text-primary);
}

.expired-date {
  color: #F56C6C;
}

.datetime {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--admin-text-secondary);
}

.duration {
  font-weight: 500;
  color: var(--admin-text-secondary);
}

.remaining {
  font-weight: 600;
  color: #67C23A;
  
  &.warning {
    color: #E6A23C;
  }
  
  &.danger {
    color: #F56C6C;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--admin-card-bg);
  border-radius: 12px;
  box-shadow: var(--admin-card-shadow);
  border: 1px solid var(--admin-border-color-light);
  
  .stat-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    margin-right: 16px;
    
    &.primary {
      background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
    }
    
    &.success {
      background: linear-gradient(135deg, #67C23A 0%, #95d475 100%);
    }
    
    &.warning {
      background: linear-gradient(135deg, #E6A23C 0%, #f3d19e 100%);
    }
    
    &.info {
      background: linear-gradient(135deg, #909399 0%, #c0c4cc 100%);
    }
    
    .el-icon {
      font-size: 24px;
      color: #ffffff;
    }
  }
  
  .stat-info {
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--admin-text-primary);
      line-height: 1.2;
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--admin-text-secondary);
      margin-top: 4px;
    }
  }
}
</style>
