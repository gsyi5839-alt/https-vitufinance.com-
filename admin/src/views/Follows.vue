<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon><TrendCharts /></el-icon>
        跟单管理
      </h2>
      <p class="description">查看和管理用户的跟单交易记录</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatAmount(stats.totalInvestment) }}</div>
            <div class="stat-label">跟单总额 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeFollowers }}</div>
            <div class="stat-label">活跃跟单者</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><DataLine /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalProfit }}</div>
            <div class="stat-label">累计收益 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.profitRate }}%</div>
            <div class="stat-label">平均收益率</div>
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
        <el-form-item label="跟单类型">
          <el-select v-model="searchForm.follow_type" placeholder="全部" clearable style="width: 140px">
            <el-option label="网格交易" value="grid" />
            <el-option label="高频交易" value="high" />
            <el-option label="趋势跟踪" value="trend" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="进行中" value="active" />
            <el-option label="已暂停" value="paused" />
            <el-option label="已结束" value="ended" />
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
      :data="followList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="180">
        <template #default="{ row }">
          <div class="wallet-address" @click="copyText(row.wallet_address)">
            {{ shortenAddress(row.wallet_address) }}
            <el-icon><CopyDocument /></el-icon>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="follow_type" label="跟单类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getFollowTypeColor(row.follow_type)" size="small">
            {{ getFollowTypeText(row.follow_type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="trader_name" label="跟随交易员" width="120">
        <template #default="{ row }">
          <div class="trader-info">
            <span class="trader-name">{{ row.trader_name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="investment" label="投入金额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.investment) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="current_value" label="当前价值" width="140" align="right">
        <template #default="{ row }">
          <span class="amount" :class="row.profit >= 0 ? 'positive' : 'negative'">
            {{ formatAmount(row.current_value) }} USDT
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="profit" label="收益" width="120" align="right">
        <template #default="{ row }">
          <span :class="['amount', row.profit >= 0 ? 'positive' : 'negative']">
            {{ row.profit >= 0 ? '+' : '' }}{{ formatAmount(row.profit) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="profit_rate" label="收益率" width="100" align="center">
        <template #default="{ row }">
          <span :class="['rate', row.profit_rate >= 0 ? 'positive' : 'negative']">
            {{ row.profit_rate >= 0 ? '+' : '' }}{{ row.profit_rate }}%
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="is_quantified" label="量化" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_quantified ? 'success' : 'warning'" size="small">
            {{ row.is_quantified ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="开始时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleViewDetail(row)">
            详情
          </el-button>
          <el-button
            v-if="row.status === 'active'"
            type="warning"
            link
            size="small"
            @click="handlePause(row)"
          >
            暂停
          </el-button>
          <el-button
            v-if="row.status === 'paused'"
            type="success"
            link
            size="small"
            @click="handleResume(row)"
          >
            恢复
          </el-button>
          <el-button
            v-if="row.status !== 'ended'"
            type="danger"
            link
            size="small"
            @click="handleEnd(row)"
          >
            结束
          </el-button>
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
    
    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="跟单详情"
      size="600px"
    >
      <template v-if="currentFollow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="钱包地址" :span="2">
            <span class="wallet-address" @click="copyText(currentFollow.wallet_address)">
              {{ currentFollow.wallet_address }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="跟单类型">
            <el-tag :type="getFollowTypeColor(currentFollow.follow_type)" size="small">
              {{ getFollowTypeText(currentFollow.follow_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="跟随交易员">
            {{ currentFollow.trader_name }}
          </el-descriptions-item>
          <el-descriptions-item label="投入金额">
            <span class="amount">{{ formatAmount(currentFollow.investment) }} USDT</span>
          </el-descriptions-item>
          <el-descriptions-item label="当前价值">
            <span class="amount" :class="currentFollow.profit >= 0 ? 'positive' : 'negative'">
              {{ formatAmount(currentFollow.current_value) }} USDT
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="累计收益">
            <span :class="['amount', currentFollow.profit >= 0 ? 'positive' : 'negative']">
              {{ currentFollow.profit >= 0 ? '+' : '' }}{{ formatAmount(currentFollow.profit) }} USDT
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="收益率">
            <span :class="['rate', currentFollow.profit_rate >= 0 ? 'positive' : 'negative']">
              {{ currentFollow.profit_rate >= 0 ? '+' : '' }}{{ currentFollow.profit_rate }}%
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <span :class="['status-badge', currentFollow.status]">
              {{ getStatusText(currentFollow.status) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="交易次数">
            {{ currentFollow.trade_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatTime(currentFollow.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatTime(currentFollow.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 交易历史 -->
        <div class="trade-history" style="margin-top: 24px;">
          <h4 style="margin-bottom: 16px; color: var(--admin-text-primary);">近期交易记录</h4>
          <el-table :data="currentFollow.trades || []" size="small" stripe>
            <el-table-column prop="time" label="时间" width="140">
              <template #default="{ row }">
                {{ formatTime(row.time) }}
              </template>
            </el-table-column>
            <el-table-column prop="pair" label="交易对" width="100" />
            <el-table-column prop="side" label="方向" width="80">
              <template #default="{ row }">
                <el-tag :type="row.side === 'buy' ? 'success' : 'danger'" size="small">
                  {{ row.side === 'buy' ? '买入' : '卖出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="数量" width="100" />
            <el-table-column prop="price" label="价格" width="100" />
            <el-table-column prop="profit" label="收益">
              <template #default="{ row }">
                <span :class="['amount', row.profit >= 0 ? 'positive' : 'negative']">
                  {{ row.profit >= 0 ? '+' : '' }}{{ row.profit }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 跟单管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  TrendCharts, User, DataLine, Trophy, Search, Refresh, CopyDocument 
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import request from '@/api'

// 加载状态
const loading = ref(false)

// 统计数据
const stats = reactive({
  totalInvestment: 0,
  activeFollowers: 0,
  totalProfit: 0,
  profitRate: 0
})

// 跟单列表
const followList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: '',
  follow_type: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 详情抽屉
const detailDrawerVisible = ref(false)
const currentFollow = ref(null)

/**
 * 获取跟单列表
 */
const fetchFollows = async () => {
  loading.value = true
  try {
    const res = await request.get('/follows', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        wallet_address: searchForm.wallet_address || undefined,
        follow_type: searchForm.follow_type || undefined,
        status: searchForm.status || undefined
      }
    })
    
    if (res.success) {
      followList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取跟单列表失败:', error)
    followList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

/**
 * 获取统计数据
 */
const fetchStats = async () => {
  try {
    const res = await request.get('/follows/stats')
    if (res.success && res.data) {
      Object.assign(stats, res.data)
    }
  } catch (error) {
    console.error('获取跟单统计失败:', error)
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchFollows()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.follow_type = ''
  searchForm.status = ''
  pagination.page = 1
  fetchFollows()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchFollows()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchFollows()
}

/**
 * 查看详情
 */
const handleViewDetail = (row) => {
  currentFollow.value = row
  detailDrawerVisible.value = true
}

/**
 * 暂停跟单
 */
const handlePause = async (row) => {
  try {
    await ElMessageBox.confirm('确定暂停此跟单吗？', '确认暂停', { type: 'warning' })
    ElMessage.success('已暂停')
    row.status = 'paused'
  } catch {}
}

/**
 * 恢复跟单
 */
const handleResume = async (row) => {
  try {
    await ElMessageBox.confirm('确定恢复此跟单吗？', '确认恢复', { type: 'info' })
    ElMessage.success('已恢复')
    row.status = 'active'
  } catch {}
}

/**
 * 结束跟单
 */
const handleEnd = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定结束此跟单吗？结束后资金将返还用户账户。',
      '确认结束',
      { type: 'warning' }
    )
    ElMessage.success('已结束')
    row.status = 'ended'
  } catch {}
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
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

/**
 * 获取跟单类型颜色
 */
const getFollowTypeColor = (type) => {
  const colors = {
    grid: 'primary',
    high: 'warning',
    trend: 'success'
  }
  return colors[type] || 'info'
}

/**
 * 获取跟单类型文本
 */
const getFollowTypeText = (type) => {
  const texts = {
    grid: '网格交易',
    high: '高频交易',
    trend: '趋势跟踪'
  }
  return texts[type] || type
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const texts = {
    active: '进行中',
    paused: '已暂停',
    ended: '已结束'
  }
  return texts[status] || status
}

// 初始化
onMounted(() => {
  fetchStats()
  fetchFollows()
})
</script>

<style lang="scss" scoped>
.stats-row {
  margin-bottom: 20px;
}

.trader-info {
  .trader-name {
    font-weight: 500;
    color: var(--admin-text-primary);
  }
}

.rate {
  font-weight: 600;
  
  &.positive {
    color: var(--admin-success);
  }
  
  &.negative {
    color: var(--admin-danger);
  }
}
</style>

