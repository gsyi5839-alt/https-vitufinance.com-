<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon><List /></el-icon>
        交易记录
      </h2>
      <p class="description">查看平台所有交易流水记录</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><List /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCount }}</div>
            <div class="stat-label">总交易数</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Download /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatAmount(stats.totalIn) }}</div>
            <div class="stat-label">总入账 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon danger">
            <el-icon><Upload /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatAmount(stats.totalOut) }}</div>
            <div class="stat-label">总出账 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayCount }}</div>
            <div class="stat-label">今日交易</div>
          </div>
        </div>
      </el-col>
    </el-row>
    
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
        <el-form-item label="交易类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 140px">
            <el-option label="充值" value="deposit" />
            <el-option label="提款" value="withdraw" />
            <el-option label="购买机器人" value="robot_buy" />
            <el-option label="质押" value="pledge" />
            <el-option label="质押收益" value="pledge_reward" />
            <el-option label="跟单" value="follow" />
            <el-option label="跟单收益" value="follow_profit" />
            <el-option label="推荐奖励" value="referral_reward" />
            <el-option label="量化收益" value="quantify_profit" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
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
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="transactionList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="tx_id" label="交易ID" width="140">
        <template #default="{ row }">
          <span class="tx-id">{{ row.tx_id }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="180">
        <template #default="{ row }">
          <div class="wallet-address" @click="copyText(row.wallet_address)">
            {{ shortenAddress(row.wallet_address) }}
            <el-icon><CopyDocument /></el-icon>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="type" label="交易类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getTypeColor(row.type)" size="small">
            {{ getTypeText(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="direction" label="方向" width="80" align="center">
        <template #default="{ row }">
          <span :class="['direction', row.direction]">
            {{ row.direction === 'in' ? '收入' : '支出' }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="amount" label="金额" width="140" align="right">
        <template #default="{ row }">
          <span :class="['amount', row.direction === 'in' ? 'positive' : 'negative']">
            {{ row.direction === 'in' ? '+' : '-' }}{{ formatAmount(row.amount) }} {{ row.token }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="balance_after" label="交易后余额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.balance_after) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="remark" label="备注" min-width="150">
        <template #default="{ row }">
          <el-tooltip v-if="row.remark && row.remark.length > 20" :content="row.remark" placement="top">
            <span class="remark">{{ row.remark.slice(0, 20) }}...</span>
          </el-tooltip>
          <span v-else class="remark">{{ row.remark || '-' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="交易时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
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
 * 交易记录页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  List, Download, Upload, Clock, Search, Refresh, CopyDocument 
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import request from '@/api'

// 加载状态
const loading = ref(false)

// 统计数据
const stats = reactive({
  totalCount: 0,
  totalIn: 0,
  totalOut: 0,
  todayCount: 0
})

// 交易列表
const transactionList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: '',
  type: '',
  dateRange: null
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

/**
 * 获取交易列表
 */
const fetchTransactions = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      wallet_address: searchForm.wallet_address || undefined,
      type: searchForm.type || undefined
    }
    
    if (searchForm.dateRange) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    
    const res = await request.get('/transactions', { params })
    
    if (res.success) {
      transactionList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取交易记录失败:', error)
    // 使用模拟数据
    transactionList.value = generateMockData()
    pagination.total = 100
  } finally {
    loading.value = false
  }
}

/**
 * 生成模拟数据
 */
const generateMockData = () => {
  const types = ['deposit', 'withdraw', 'robot_buy', 'pledge', 'pledge_reward', 'follow', 'follow_profit', 'referral_reward', 'quantify_profit']
  const directions = { deposit: 'in', withdraw: 'out', robot_buy: 'out', pledge: 'out', pledge_reward: 'in', follow: 'out', follow_profit: 'in', referral_reward: 'in', quantify_profit: 'in' }
  
  let balance = 10000
  
  return Array.from({ length: 10 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)]
    const direction = directions[type]
    const amount = (Math.random() * 1000 + 10).toFixed(2)
    
    if (direction === 'in') {
      balance += parseFloat(amount)
    } else {
      balance -= parseFloat(amount)
    }
    
    return {
      id: i + 1,
      tx_id: `TX${Date.now()}${i}`.slice(0, 14),
      wallet_address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      type,
      direction,
      amount,
      token: 'USDT',
      balance_after: balance.toFixed(2),
      remark: getTypeRemark(type),
      created_at: dayjs().subtract(Math.floor(Math.random() * 30), 'day').subtract(Math.floor(Math.random() * 24), 'hour').toISOString()
    }
  })
}

/**
 * 获取类型备注
 */
const getTypeRemark = (type) => {
  const remarks = {
    deposit: '用户充值',
    withdraw: '用户提款',
    robot_buy: '购买量化机器人',
    pledge: '质押锁仓',
    pledge_reward: '质押收益发放',
    follow: '跟单投资',
    follow_profit: '跟单收益结算',
    referral_reward: '推荐奖励',
    quantify_profit: '量化收益发放'
  }
  return remarks[type] || ''
}

/**
 * 获取统计数据
 */
const fetchStats = async () => {
  try {
    const res = await request.get('/transactions/stats')
    if (res.success && res.data) {
      Object.assign(stats, res.data)
    }
  } catch (error) {
    // 使用模拟数据
    stats.totalCount = 12568
    stats.totalIn = 568900.45
    stats.totalOut = 234560.78
    stats.todayCount = 128
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchTransactions()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.type = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchTransactions()
}

/**
 * 导出
 */
const handleExport = () => {
  ElMessage.success('导出功能开发中')
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchTransactions()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchTransactions()
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
  if (address.length <= 20) return address
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2)
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取类型颜色
 */
const getTypeColor = (type) => {
  const colors = {
    deposit: 'success',
    withdraw: 'danger',
    robot_buy: 'primary',
    pledge: 'warning',
    pledge_reward: 'success',
    follow: 'primary',
    follow_profit: 'success',
    referral_reward: 'success',
    quantify_profit: 'success'
  }
  return colors[type] || 'info'
}

/**
 * 获取类型文本
 */
const getTypeText = (type) => {
  const texts = {
    deposit: '充值',
    withdraw: '提款',
    robot_buy: '购买机器人',
    pledge: '质押',
    pledge_reward: '质押收益',
    follow: '跟单',
    follow_profit: '跟单收益',
    referral_reward: '推荐奖励',
    quantify_profit: '量化收益'
  }
  return texts[type] || type
}

// 初始化
onMounted(() => {
  fetchStats()
  fetchTransactions()
})
</script>

<style lang="scss" scoped>
.stats-row {
  margin-bottom: 20px;
}

.tx-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--admin-text-secondary);
}

.direction {
  font-weight: 500;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  
  &.in {
    color: var(--admin-success);
    background: rgba(103, 194, 58, 0.1);
  }
  
  &.out {
    color: var(--admin-danger);
    background: rgba(245, 108, 108, 0.1);
  }
}

.remark {
  font-size: 13px;
  color: var(--admin-text-secondary);
}

.stat-card .stat-icon.danger {
  background: linear-gradient(135deg, #F56C6C 0%, #fab6b6 100%);
}
</style>

