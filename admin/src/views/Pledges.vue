<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon><Coin /></el-icon>
        质押管理
      </h2>
      <p class="description">查看和管理用户的质押记录</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon primary">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatAmount(stats.totalPledge) }}</div>
            <div class="stat-label">质押总额 (USDT)</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon success">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activePledges }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon warning">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.expiringSoon }}</div>
            <div class="stat-label">即将到期</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-icon info">
            <el-icon><Finished /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completedPledges }}</div>
            <div class="stat-label">已完成</div>
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
        <el-form-item label="质押状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="质押产品">
          <el-select v-model="searchForm.product" placeholder="全部" clearable style="width: 140px">
            <el-option label="30天锁仓" value="30days" />
            <el-option label="60天锁仓" value="60days" />
            <el-option label="90天锁仓" value="90days" />
            <el-option label="180天锁仓" value="180days" />
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
      :data="pledgeList"
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
      
      <el-table-column prop="product_name" label="质押产品" width="120">
        <template #default="{ row }">
          <el-tag type="primary" size="small">{{ row.product_name }}</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="amount" label="质押金额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount positive">{{ formatAmount(row.amount) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="apr" label="年化收益率" width="110" align="center">
        <template #default="{ row }">
          <span class="rate">{{ row.apr }}%</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="expected_reward" label="预期收益" width="130" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.expected_reward) }} USDT</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <span :class="['status-badge', row.status]">
            {{ getStatusText(row.status) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="start_date" label="开始日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.start_date) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="end_date" label="到期日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.end_date) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleViewDetail(row)">
            详情
          </el-button>
          <el-button
            v-if="row.status === 'active'"
            type="danger"
            link
            size="small"
            @click="handleCancel(row)"
          >
            取消
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
      title="质押详情"
      size="500px"
    >
      <template v-if="currentPledge">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="钱包地址">
            <span class="wallet-address" @click="copyText(currentPledge.wallet_address)">
              {{ currentPledge.wallet_address }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="质押产品">
            {{ currentPledge.product_name }}
          </el-descriptions-item>
          <el-descriptions-item label="质押金额">
            <span class="amount positive">{{ formatAmount(currentPledge.amount) }} USDT</span>
          </el-descriptions-item>
          <el-descriptions-item label="年化收益率">
            {{ currentPledge.apr }}%
          </el-descriptions-item>
          <el-descriptions-item label="预期收益">
            {{ formatAmount(currentPledge.expected_reward) }} USDT
          </el-descriptions-item>
          <el-descriptions-item label="已发放收益">
            {{ formatAmount(currentPledge.paid_reward) }} USDT
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <span :class="['status-badge', currentPledge.status]">
              {{ getStatusText(currentPledge.status) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatTime(currentPledge.start_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="到期时间">
            {{ formatTime(currentPledge.end_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(currentPledge.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 质押管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Coin, Check, Timer, Finished, Search, Refresh, CopyDocument 
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import request from '@/api'

// 加载状态
const loading = ref(false)

// 统计数据
const stats = reactive({
  totalPledge: 0,
  activePledges: 0,
  expiringSoon: 0,
  completedPledges: 0
})

// 质押列表
const pledgeList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: '',
  status: '',
  product: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 详情抽屉
const detailDrawerVisible = ref(false)
const currentPledge = ref(null)

/**
 * 获取质押列表
 */
const fetchPledges = async () => {
  loading.value = true
  try {
    const res = await request.get('/pledges', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        wallet_address: searchForm.wallet_address || undefined,
        status: searchForm.status || undefined,
        product: searchForm.product || undefined
      }
    })
    
    if (res.success) {
      pledgeList.value = res.data.list || []
      pagination.total = res.data.total || 0
      
      // 更新统计数据
      if (res.data.stats) {
        Object.assign(stats, res.data.stats)
      }
    }
  } catch (error) {
    console.error('获取质押列表失败:', error)
    pledgeList.value = []
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
    const res = await request.get('/pledges/stats')
    if (res.success && res.data) {
      Object.assign(stats, res.data)
    }
  } catch (error) {
    console.error('获取质押统计失败:', error)
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchPledges()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.status = ''
  searchForm.product = ''
  pagination.page = 1
  fetchPledges()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchPledges()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchPledges()
}

/**
 * 查看详情
 */
const handleViewDetail = (row) => {
  currentPledge.value = row
  detailDrawerVisible.value = true
}

/**
 * 取消质押
 */
const handleCancel = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定取消此质押吗？取消后本金将退回用户账户，已产生的收益将清零。`,
      '确认取消',
      { type: 'warning' }
    )
    
    const res = await request.post(`/pledges/${row.id}/cancel`)
    if (res.success) {
      ElMessage.success('取消成功')
      fetchPledges()
    } else {
      ElMessage.error(res.message || '取消失败')
    }
  } catch {
    // 用户取消
  }
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
 * 格式化日期
 */
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const texts = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

// 初始化
onMounted(() => {
  fetchStats()
  fetchPledges()
})
</script>

<style lang="scss" scoped>
.stats-row {
  margin-bottom: 20px;
}

.rate {
  font-weight: 600;
  color: var(--admin-success);
}
</style>

