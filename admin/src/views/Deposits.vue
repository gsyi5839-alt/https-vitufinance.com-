<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>充值记录</h2>
      <p class="description">查看和管理所有用户的充值记录</p>
    </div>
    
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
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
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
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="depositList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="180">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyText(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="amount" label="充值金额" width="130" align="right">
        <template #default="{ row }">
          <span class="amount positive">+{{ formatAmount(row.amount) }} {{ row.token }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="tx_hash" label="交易哈希" min-width="180">
        <template #default="{ row }">
          <template v-if="row.tx_hash">
          <el-tooltip :content="row.tx_hash" placement="top">
            <span class="tx-hash" @click="copyText(row.tx_hash)">
              {{ shortenHash(row.tx_hash) }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-tooltip>
          </template>
          <span v-else class="no-data">-</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="completed_at" label="完成时间" width="170">
        <template #default="{ row }">
          {{ row.completed_at ? formatTime(row.completed_at) : '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
          <el-button
            type="success"
            link
            size="small"
            @click="handleComplete(row)"
          >
            确认完成
          </el-button>
          <el-button
            type="danger"
            link
            size="small"
            @click="handleFail(row)"
          >
            标记失败
          </el-button>
          </template>
          <template v-else-if="row.status === 'completed'">
            <el-tag type="success" size="small">已处理</el-tag>
          </template>
          <template v-else-if="row.status === 'failed'">
            <el-tag type="danger" size="small">已失败</el-tag>
          </template>
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
 * 充值记录页面
 */
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, CopyDocument } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getDeposits, updateDepositStatus } from '@/api'
import eventBus, { EVENTS } from '@/utils/eventBus'

// 加载状态
const loading = ref(false)

// 充值列表
const depositList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: '',
  status: '',
  dateRange: null
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

/**
 * 获取充值记录
 */
const fetchDeposits = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      wallet_address: searchForm.wallet_address || undefined,
      status: searchForm.status || undefined
    }
    
    if (searchForm.dateRange) {
      params.start_date = searchForm.dateRange[0]
      params.end_date = searchForm.dateRange[1]
    }
    
    const res = await getDeposits(params)
    
    if (res.success) {
      depositList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取充值记录失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchDeposits()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.status = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchDeposits()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchDeposits()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchDeposits()
}

/**
 * 确认完成
 */
const handleComplete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定将此充值记录标记为已完成吗？\n金额：${row.amount} ${row.token}`,
      '确认操作',
      { type: 'warning' }
    )
    
    const res = await updateDepositStatus(row.id, 'completed')
    if (res.success) {
      ElMessage.success('操作成功')
      fetchDeposits()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 标记失败
 */
const handleFail = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定将此充值记录标记为失败吗？\n金额：${row.amount} ${row.token}`,
      '确认操作',
      { type: 'warning' }
    )
    
    const res = await updateDepositStatus(row.id, 'failed')
    if (res.success) {
      ElMessage.success('操作成功')
      fetchDeposits()
    } else {
      ElMessage.error(res.message || '操作失败')
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
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

/**
 * 缩短哈希
 */
const shortenHash = (hash) => {
  if (!hash) return ''
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(4)
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取状态类型
 */
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

// 处理刷新事件
const handleRefreshEvent = () => {
  console.log('[Deposits] 收到刷新事件，重新获取数据')
  fetchDeposits()
}

// 初始化
onMounted(() => {
  fetchDeposits()
  // 监听刷新事件
  eventBus.on(EVENTS.REFRESH_DEPOSITS, handleRefreshEvent)
})

// 清理
onUnmounted(() => {
  eventBus.off(EVENTS.REFRESH_DEPOSITS, handleRefreshEvent)
})
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.wallet-address,
.tx-hash {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
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

.no-data {
  color: #c0c4cc;
}
</style>

