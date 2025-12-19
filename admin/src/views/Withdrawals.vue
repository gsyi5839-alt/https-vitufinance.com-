<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>提款记录</h2>
      <p class="description">查看和处理所有用户的提款申请</p>
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
            <el-option label="处理中" value="processing" />
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
      :data="withdrawalList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="160">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyText(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="amount" label="提款金额" width="120" align="right">
        <template #default="{ row }">
          <span class="amount negative">{{ formatAmount(row.amount) }} {{ row.token }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="fee" label="手续费(0.5%)" width="110" align="right">
        <template #default="{ row }">
          <span class="fee-amount">{{ formatAmount(row.fee || row.amount * 0.005) }} {{ row.token }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="actual_amount" label="实际到账" width="120" align="right">
        <template #default="{ row }">
          <span class="actual-amount">{{ formatAmount(row.actual_amount || row.amount * 0.995) }} {{ row.token }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="to_address" label="接收地址" min-width="160">
        <template #default="{ row }">
          <el-tooltip :content="row.to_address" placement="top">
            <span class="wallet-address" @click="copyText(row.to_address)">
              {{ shortenAddress(row.to_address) }}
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="tx_hash" label="交易哈希" min-width="150">
        <template #default="{ row }">
          <template v-if="row.tx_hash">
            <el-tooltip :content="row.tx_hash" placement="top">
              <span class="tx-hash" @click="copyText(row.tx_hash)">
                {{ shortenHash(row.tx_hash) }}
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
      
      <el-table-column prop="created_at" label="申请时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button type="primary" link size="small" @click="handleProcess(row)">
              处理
            </el-button>
            <el-button type="danger" link size="small" @click="handleReject(row)">
              拒绝
            </el-button>
          </template>
          <template v-else-if="row.status === 'processing'">
            <el-button type="success" link size="small" @click="handleComplete(row)">
              完成
            </el-button>
            <el-button type="danger" link size="small" @click="handleFail(row)">
              失败
            </el-button>
          </template>
          <template v-else-if="row.status === 'failed'">
            <el-button type="warning" link size="small" @click="handleRetry(row)">
              重新处理
            </el-button>
          </template>
          <template v-else-if="row.status === 'completed'">
            <el-button type="info" link size="small" @click="viewTxHash(row)">
              查看交易
            </el-button>
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
    
    <!-- 处理提款弹窗 -->
    <el-dialog
      v-model="processDialogVisible"
      title="处理提款申请"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="processFormRef"
        :model="processForm"
        :rules="processRules"
        label-width="100px"
      >
        <el-form-item label="提款金额">
          <span class="amount">{{ formatAmount(processForm.amount) }} {{ processForm.token }}</span>
        </el-form-item>
        <el-form-item label="手续费(0.5%)">
          <span class="fee-amount">{{ formatAmount(processForm.amount * 0.005) }} {{ processForm.token }}</span>
        </el-form-item>
        <el-form-item label="实际到账">
          <span class="actual-amount">{{ formatAmount(processForm.amount * 0.995) }} {{ processForm.token }}</span>
        </el-form-item>
        <el-form-item label="接收地址">
          <span class="wallet-address">{{ processForm.to_address }}</span>
        </el-form-item>
        <el-form-item label="交易哈希" prop="tx_hash">
          <el-input
            v-model="processForm.tx_hash"
            placeholder="请输入转账后的交易哈希"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可选备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitProcess">
          确认处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 提款记录页面
 */
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import eventBus, { EVENTS } from '@/utils/eventBus'
import dayjs from 'dayjs'
import { getWithdrawals, processWithdrawal } from '@/api'

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 提款列表
const withdrawalList = ref([])

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

// 处理弹窗
const processDialogVisible = ref(false)
const processFormRef = ref(null)
const processForm = reactive({
  id: 0,
  amount: 0,
  token: 'USDT',
  to_address: '',
  tx_hash: '',
  remark: ''
})

const processRules = {
  tx_hash: [{ required: true, message: '请输入交易哈希', trigger: 'blur' }]
}

/**
 * 获取提款记录
 */
const fetchWithdrawals = async () => {
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
    
    const res = await getWithdrawals(params)
    
    if (res.success) {
      withdrawalList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取提款记录失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchWithdrawals()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  searchForm.status = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchWithdrawals()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchWithdrawals()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchWithdrawals()
}

/**
 * 处理提款
 */
const handleProcess = (row) => {
  processForm.id = row.id
  processForm.amount = row.amount
  processForm.token = row.token
  processForm.to_address = row.to_address
  processForm.tx_hash = ''
  processForm.remark = ''
  processDialogVisible.value = true
}

/**
 * 提交处理
 */
const handleSubmitProcess = async () => {
  const valid = await processFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    const res = await processWithdrawal(processForm.id, {
      status: 'processing',
      tx_hash: processForm.tx_hash,
      remark: processForm.remark
    })
    
    if (res.success) {
      ElMessage.success('处理成功')
      processDialogVisible.value = false
      fetchWithdrawals()
    } else {
      ElMessage.error(res.message || '处理失败')
    }
  } catch (error) {
    console.error('处理提款失败:', error)
  } finally {
    submitting.value = false
  }
}

/**
 * 拒绝提款
 */
const handleReject = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定拒绝此提款申请吗？\n金额：${row.amount} ${row.token}\n余额将退回用户账户`,
      '确认拒绝',
      { type: 'warning' }
    )
    
    const res = await processWithdrawal(row.id, { status: 'failed', action: 'reject' })
    if (res.success) {
      ElMessage.success('已拒绝')
      fetchWithdrawals()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 完成提款 - 需要输入交易哈希
 */
const handleComplete = async (row) => {
  try {
    // 如果已有交易哈希，直接确认完成
    if (row.tx_hash && row.tx_hash !== '。') {
      await ElMessageBox.confirm(
        `确定将此提款标记为已完成吗？\n金额：${row.amount} ${row.token}\n交易哈希：${shortenHash(row.tx_hash)}`,
        '确认完成',
        { type: 'success' }
      )
      
      const res = await processWithdrawal(row.id, { status: 'completed' })
      if (res.success) {
        ElMessage.success('已完成')
        fetchWithdrawals()
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } else {
      // 没有交易哈希，需要输入
      const { value: txHash } = await ElMessageBox.prompt(
        `请输入提款交易哈希\n金额：${row.amount} ${row.token}\n地址：${shortenAddress(row.wallet_address)}`,
        '完成提款',
        {
          confirmButtonText: '确认完成',
          cancelButtonText: '取消',
          inputPattern: /^0x[a-fA-F0-9]{64}$/,
          inputErrorMessage: '请输入有效的交易哈希 (0x开头的66位十六进制)',
          inputPlaceholder: '0x...'
        }
      )
      
      const res = await processWithdrawal(row.id, { 
        status: 'completed',
        tx_hash: txHash
      })
      if (res.success) {
        ElMessage.success('已完成')
        fetchWithdrawals()
      } else {
        ElMessage.error(res.message || '操作失败')
      }
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
      `确定将此提款标记为失败吗？\n金额：${row.amount} ${row.token}\n余额将退回用户账户`,
      '确认失败',
      { type: 'warning' }
    )
    
    const res = await processWithdrawal(row.id, { status: 'failed' })
    if (res.success) {
      ElMessage.success('已标记失败')
      fetchWithdrawals()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 重新处理失败的提款
 */
const handleRetry = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定重新处理此提款申请吗？\n金额：${row.amount} ${row.token}\n状态将改为"待处理"`,
      '重新处理',
      { type: 'warning' }
    )
    
    const res = await processWithdrawal(row.id, { status: 'pending' })
    if (res.success) {
      ElMessage.success('已重新提交处理')
      fetchWithdrawals()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 查看交易哈希
 */
const viewTxHash = (row) => {
  if (row.tx_hash) {
    // 打开BSC浏览器查看交易
    window.open(`https://bscscan.com/tx/${row.tx_hash}`, '_blank')
  } else {
    ElMessage.warning('该交易没有链上哈希')
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
    processing: 'info',
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
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

// 处理刷新事件
const handleRefreshEvent = () => {
  console.log('[Withdrawals] 收到刷新事件，重新获取数据')
  fetchWithdrawals()
}

// 初始化
onMounted(() => {
  fetchWithdrawals()
  // 监听刷新事件
  eventBus.on(EVENTS.REFRESH_WITHDRAWALS, handleRefreshEvent)
})

// 清理
onUnmounted(() => {
  eventBus.off(EVENTS.REFRESH_WITHDRAWALS, handleRefreshEvent)
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
  
  &:hover {
    color: #409EFF;
  }
}

.amount {
  font-weight: 600;
  
  &.negative {
    color: #F56C6C;
  }
}

.fee-amount {
  color: #E6A23C;
  font-weight: 500;
}

.actual-amount {
  color: #67C23A;
  font-weight: 600;
}

.no-data,
.no-action {
  color: #c0c4cc;
}
</style>

