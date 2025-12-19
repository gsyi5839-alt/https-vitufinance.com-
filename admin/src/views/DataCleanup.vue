<template>
  <div class="data-cleanup">
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 虚假充值检测 -->
      <el-tab-pane label="虚假充值检测" name="fakeDeposits">
        <!-- 统计卡片 -->
        <el-row :gutter="16" class="stat-row">
          <el-col :xs="24" :sm="8">
            <div class="stat-card">
              <div class="stat-icon warning">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ fakeData.summary?.fakeAccountCount || 0 }}</div>
                <div class="stat-label">可疑账户</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="8">
            <div class="stat-card">
              <div class="stat-icon danger">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ fakeData.summary?.suspiciousDepositCount || 0 }}</div>
                <div class="stat-label">可疑充值记录</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="8">
            <div class="stat-card">
              <div class="stat-icon primary">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatNumber(fakeData.summary?.totalFakeAmount || 0) }}</div>
                <div class="stat-label">虚假金额(USDT)</div>
              </div>
            </div>
          </el-col>
        </el-row>
        
        <!-- 虚假余额账户 -->
        <el-card shadow="hover" class="table-card">
          <template #header>
            <div class="card-header">
              <span>⚠️ 虚假余额账户</span>
              <div class="header-actions">
                <el-button 
                  v-if="selectedFakeAccounts.length > 0" 
                  type="danger" 
                  size="small"
                  @click="batchClearFake"
                >
                  批量清理 ({{ selectedFakeAccounts.length }})
                </el-button>
                <el-button type="primary" size="small" @click="detectFakeDeposits" :loading="loading.detect">
                  <el-icon><Refresh /></el-icon>
                  检测
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table 
            :data="fakeData.fakeAccounts" 
            stripe 
            size="small"
            v-loading="loading.detect"
            @selection-change="handleFakeSelection"
            :max-height="300"
          >
            <el-table-column type="selection" width="40" />
            <el-table-column prop="wallet_address" label="钱包地址" min-width="160">
              <template #default="{ row }">
                <span class="wallet-addr">{{ formatAddress(row.wallet_address) }}</span>
                <el-button link type="primary" size="small" @click="copyAddress(row.wallet_address)">
                  <el-icon size="12"><CopyDocument /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="usdt_balance" label="当前余额" width="120" align="right">
              <template #default="{ row }">
                <span class="text-success">{{ formatNumber(row.usdt_balance) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="actual_deposit" label="真实充值" width="120" align="right">
              <template #default="{ row }">
                <span class="text-primary">{{ formatNumber(row.actual_deposit) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="fake_amount" label="虚假金额" width="120" align="right">
              <template #default="{ row }">
                <el-tag type="danger" size="small">{{ formatNumber(row.fake_amount) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="clearFakeBalance(row)">清理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        
        <!-- 可疑充值记录 -->
        <el-card shadow="hover" class="table-card">
          <template #header>
            <div class="card-header">
              <span>🔍 可疑充值记录</span>
            </div>
          </template>
          
          <el-table 
            :data="fakeData.suspiciousDeposits" 
            stripe 
            size="small"
            v-loading="loading.detect"
            :max-height="250"
          >
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="wallet_address" label="钱包地址" min-width="140">
              <template #default="{ row }">
                <span class="wallet-addr">{{ formatAddress(row.wallet_address) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="tx_hash" label="交易哈希" min-width="160">
              <template #default="{ row }">
                <el-tooltip :content="row.tx_hash" placement="top">
                  <span class="tx-hash">{{ row.tx_hash?.slice(0, 16) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="validity" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.validity === 'valid' ? 'success' : 'danger'" size="small">
                  {{ row.validity === 'incomplete' ? '不完整' : '可疑' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="140">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="deleteSuspiciousDeposit(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      
      <!-- 推荐关系管理 -->
      <el-tab-pane label="推荐关系管理" name="referrals">
        <el-card shadow="hover" class="table-card">
          <template #header>
            <div class="card-header">
              <span>👥 推荐关系列表</span>
              <div class="header-actions">
                <el-input 
                  v-model="referralFilters.wallet_address" 
                  placeholder="搜索钱包地址..." 
                  clearable
                  size="small"
                  style="width: 200px"
                  @keyup.enter="fetchReferrals"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button 
                  v-if="selectedReferrals.length > 0" 
                  type="danger" 
                  size="small"
                  @click="batchRemoveReferrals"
                >
                  批量移除 ({{ selectedReferrals.length }})
                </el-button>
                <el-button type="primary" size="small" @click="fetchReferrals" :loading="loading.referrals">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table 
            :data="referralList" 
            stripe 
            size="small"
            v-loading="loading.referrals"
            @selection-change="handleReferralSelection"
          >
            <el-table-column type="selection" width="40" />
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="user_address" label="用户地址" min-width="160">
              <template #default="{ row }">
                <span class="wallet-addr">{{ formatAddress(row.user_address) }}</span>
                <el-button link type="primary" size="small" @click="copyAddress(row.user_address)">
                  <el-icon size="12"><CopyDocument /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="referrer_address" label="推荐人地址" min-width="160">
              <template #default="{ row }">
                <span class="wallet-addr">{{ formatAddress(row.referrer_address) }}</span>
                <el-button link type="primary" size="small" @click="copyAddress(row.referrer_address)">
                  <el-icon size="12"><CopyDocument /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="user_deposit" label="用户充值" width="100" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.user_deposit) }}
              </template>
            </el-table-column>
            <el-table-column prop="user_balance" label="用户余额" width="100" align="right">
              <template #default="{ row }">
                {{ formatNumber(row.user_balance) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="绑定时间" width="140">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="removeReferral(row.id)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="referralPagination.page"
              v-model:page-size="referralPagination.pageSize"
              :total="referralPagination.total"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              size="small"
              @current-change="fetchReferrals"
              @size-change="fetchReferrals"
            />
          </div>
        </el-card>
      </el-tab-pane>
      
      <!-- 清理日志 -->
      <el-tab-pane label="清理日志" name="logs">
        <el-card shadow="hover" class="table-card">
          <template #header>
            <div class="card-header">
              <span>📋 操作日志</span>
              <el-button type="primary" size="small" @click="fetchLogs" :loading="loading.logs">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          
          <el-tabs v-model="logsTab" class="inner-tabs">
            <el-tab-pane label="余额清理" name="balance">
              <el-table :data="logs.balanceLogs" stripe size="small" v-loading="loading.logs" :max-height="400">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="wallet_address" label="钱包地址" min-width="150">
                  <template #default="{ row }">
                    <span class="wallet-addr">{{ formatAddress(row.wallet_address) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="usdt_balance_before" label="清理前USDT" width="120" align="right">
                  <template #default="{ row }">
                    {{ formatNumber(row.usdt_balance_before) }}
                  </template>
                </el-table-column>
                <el-table-column prop="wld_balance_before" label="清理前WLD" width="120" align="right">
                  <template #default="{ row }">
                    {{ formatNumber(row.wld_balance_before) }}
                  </template>
                </el-table-column>
                <el-table-column prop="action" label="类型" width="100">
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.action }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="admin_user" label="操作人" width="80" />
                <el-table-column prop="created_at" label="时间" width="140">
                  <template #default="{ row }">
                    {{ formatDate(row.created_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="推荐关系清理" name="referral">
              <el-table :data="logs.referralLogs" stripe size="small" v-loading="loading.logs" :max-height="400">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="user_address" label="用户地址" min-width="150">
                  <template #default="{ row }">
                    <span class="wallet-addr">{{ formatAddress(row.user_address) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="referrer_address" label="推荐人地址" min-width="150">
                  <template #default="{ row }">
                    <span class="wallet-addr">{{ formatAddress(row.referrer_address) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="admin_user" label="操作人" width="80" />
                <el-table-column prop="created_at" label="时间" width="140">
                  <template #default="{ row }">
                    {{ formatDate(row.created_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, CopyDocument, Warning, Document, Coin } from '@element-plus/icons-vue'
import request from '@/api'
import dayjs from 'dayjs'

// 状态
const activeTab = ref('fakeDeposits')
const logsTab = ref('balance')

const loading = reactive({
  detect: false,
  referrals: false,
  logs: false
})

// 虚假充值数据
const fakeData = reactive({
  fakeAccounts: [],
  suspiciousDeposits: [],
  summary: null
})
const selectedFakeAccounts = ref([])

// 推荐关系数据
const referralList = ref([])
const selectedReferrals = ref([])
const referralFilters = reactive({
  wallet_address: ''
})
const referralPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 日志数据
const logs = reactive({
  balanceLogs: [],
  referralLogs: []
})

// 格式化函数
const formatAddress = (addr) => {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return parseFloat(num).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('MM-DD HH:mm')
}

const copyAddress = async (addr) => {
  try {
    await navigator.clipboard.writeText(addr)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 检测虚假充值
const detectFakeDeposits = async () => {
  loading.detect = true
  try {
    const res = await request.get('/data-cleanup/fake-deposits')
    if (res.success) {
      fakeData.fakeAccounts = res.data.fakeAccounts
      fakeData.suspiciousDeposits = res.data.suspiciousDeposits
      fakeData.summary = res.data.summary
    }
  } catch (error) {
    console.error('检测失败:', error)
    ElMessage.error('检测失败')
  } finally {
    loading.detect = false
  }
}

// 清理单个虚假账户
const clearFakeBalance = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定清理 ${formatAddress(row.wallet_address)} 的虚假余额吗？`,
      '确认清理',
      { type: 'warning' }
    )
    
    const res = await request.post('/data-cleanup/clear-fake-balance', {
      wallet_address: row.wallet_address,
      keep_real_deposit: true
    })
    
    if (res.success) {
      ElMessage.success(res.message)
      detectFakeDeposits()
    } else {
      ElMessage.error(res.message || '清理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  }
}

// 批量清理虚假账户
const batchClearFake = async () => {
  if (selectedFakeAccounts.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定批量清理 ${selectedFakeAccounts.value.length} 个账户？`,
      '确认批量清理',
      { type: 'warning' }
    )
    
    const res = await request.post('/data-cleanup/batch-clear', {
      wallet_addresses: selectedFakeAccounts.value.map(a => a.wallet_address)
    })
    
    if (res.success) {
      ElMessage.success(res.message)
      selectedFakeAccounts.value = []
      detectFakeDeposits()
    } else {
      ElMessage.error(res.message || '批量清理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量清理失败')
    }
  }
}

// 删除可疑充值记录
const deleteSuspiciousDeposit = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除这条可疑充值记录吗？', '确认删除', { type: 'warning' })
    
    const res = await request.delete(`/data-cleanup/suspicious-deposit/${id}`)
    
    if (res.success) {
      ElMessage.success('删除成功')
      detectFakeDeposits()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 获取推荐关系列表
const fetchReferrals = async () => {
  loading.referrals = true
  try {
    const params = {
      page: referralPagination.page,
      pageSize: referralPagination.pageSize,
      ...referralFilters
    }
    
    const res = await request.get('/data-cleanup/referrals', { params })
    if (res.success) {
      referralList.value = res.data.referrals
      referralPagination.total = res.data.total
    }
  } catch (error) {
    console.error('获取推荐关系失败:', error)
  } finally {
    loading.referrals = false
  }
}

// 移除单个推荐关系
const removeReferral = async (id) => {
  try {
    await ElMessageBox.confirm('确定移除这条推荐关系吗？', '确认移除', { type: 'warning' })
    
    const res = await request.delete(`/data-cleanup/referral/${id}`)
    
    if (res.success) {
      ElMessage.success('移除成功')
      fetchReferrals()
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败')
    }
  }
}

// 批量移除推荐关系
const batchRemoveReferrals = async () => {
  if (selectedReferrals.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定批量移除 ${selectedReferrals.value.length} 条推荐关系吗？`,
      '确认批量移除',
      { type: 'warning' }
    )
    
    const res = await request.post('/data-cleanup/batch-remove-referrals', {
      ids: selectedReferrals.value.map(r => r.id)
    })
    
    if (res.success) {
      ElMessage.success(res.message)
      selectedReferrals.value = []
      fetchReferrals()
    } else {
      ElMessage.error(res.message || '批量移除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量移除失败')
    }
  }
}

// 获取清理日志
const fetchLogs = async () => {
  loading.logs = true
  try {
    const res = await request.get('/data-cleanup/logs')
    if (res.success) {
      logs.balanceLogs = res.data.balanceLogs
      logs.referralLogs = res.data.referralLogs
    }
  } catch (error) {
    console.error('获取日志失败:', error)
  } finally {
    loading.logs = false
  }
}

// 选择处理
const handleFakeSelection = (selection) => {
  selectedFakeAccounts.value = selection
}

const handleReferralSelection = (selection) => {
  selectedReferrals.value = selection
}

// 初始化
onMounted(() => {
  detectFakeDeposits()
  fetchReferrals()
  fetchLogs()
})
</script>

<style scoped>
.data-cleanup {
  padding: 16px;
}

.main-tabs {
  background: transparent;
}

/* 统计卡片 */
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.stat-icon.warning {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.2), rgba(230, 162, 60, 0.1));
  color: #e6a23c;
}

.stat-icon.danger {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.2), rgba(245, 108, 108, 0.1));
  color: #f56c6c;
}

.stat-icon.primary {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.2), rgba(64, 158, 255, 0.1));
  color: #409eff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 16px;
}

.table-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.table-card :deep(.el-card__body) {
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 表格样式 */
.wallet-addr {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.tx-hash {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.text-success {
  color: #67c23a;
  font-weight: 500;
}

.text-primary {
  color: #409eff;
  font-weight: 500;
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 内部tabs */
.inner-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .stat-row .el-col {
    margin-bottom: 12px;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
}
</style>
