<template>
  <div class="team-dividend-container">
    <el-card class="header-card">
      <h2><el-icon><Coin /></el-icon> 团队分红管理</h2>
    </el-card>

    <!-- 统计概览 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#409EFF"><User /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overview.total?.members || 0 }}</div>
              <div class="stat-label">累计经纪人</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#67C23A"><Coin /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ formatAmount(overview.total?.amount) }}</div>
              <div class="stat-label">累计分红总额 (USDT)</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#E6A23C"><Calendar /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overview.today?.members || 0 }}</div>
              <div class="stat-label">今日发放人数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" color="#F56C6C"><TrendCharts /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ formatAmount(overview.today?.amount) }}</div>
              <div class="stat-label">今日分红金额 (USDT)</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tab切换 -->
    <el-card class="main-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 成员分红 -->
        <el-tab-pane label="成员分红" name="members">
          <div class="filter-bar">
            <el-form :inline="true">
              <el-form-item label="等级">
                <el-select v-model="memberFilters.level" placeholder="全部等级" clearable>
                  <el-option label="全部" :value="null" />
                  <el-option label="1级" :value="1" />
                  <el-option label="2级" :value="2" />
                  <el-option label="3级" :value="3" />
                  <el-option label="4级" :value="4" />
                  <el-option label="5级" :value="5" />
                </el-select>
              </el-form-item>
              <el-form-item label="钱包地址">
                <el-input v-model="memberFilters.search" placeholder="输入钱包地址搜索" clearable />
              </el-form-item>
              <el-form-item label="日期范围">
                <el-date-picker
                  v-model="memberDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadMembers">查询</el-button>
                <el-button @click="resetMemberFilters">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="members" border stripe v-loading="loading">
            <el-table-column prop="wallet_address" label="钱包地址" width="180">
              <template #default="{ row }">
                <el-tooltip :content="row.wallet_address">
                  <span class="wallet-addr">{{ formatAddress(row.wallet_address) }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="current_level" label="当前等级" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.current_level)">{{ row.current_level }}级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="direct_members" label="直推人数" width="100" align="center" />
            <el-table-column prop="qualified_members" label="合格成员" width="100" align="center" />
            <el-table-column prop="dividend_records" label="分红次数" width="100" align="center" />
            <el-table-column prop="total_dividend" label="累计分红 (USDT)" width="150" align="right">
              <template #default="{ row }">
                <span class="amount-text">{{ formatAmount(row.total_dividend) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="last_dividend_date" label="最后分红日期" width="120" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewMemberDetail(row)">查看详情</el-button>
                <el-button size="small" type="warning" @click="showCompensateDialog(row)">补发</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="memberPagination.page"
            v-model:page-size="memberPagination.pageSize"
            :total="memberPagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadMembers"
            @size-change="loadMembers"
            class="pagination"
          />
        </el-tab-pane>

        <!-- 团队统计 -->
        <el-tab-pane label="团队统计" name="teams">
          <div class="filter-bar">
            <el-form :inline="true">
              <el-form-item label="最小人数">
                <el-input-number v-model="teamFilters.minMembers" :min="0" />
              </el-form-item>
              <el-form-item label="最小业绩">
                <el-input-number v-model="teamFilters.minPerformance" :min="0" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadTeams">查询</el-button>
                <el-button @click="resetTeamFilters">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="teams" border stripe v-loading="loading">
            <el-table-column prop="leader_address" label="团队领导人" width="180">
              <template #default="{ row }">
                <el-tooltip :content="row.leader_address">
                  <span class="wallet-addr">{{ formatAddress(row.leader_address) }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="current_level" label="等级" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.current_level)">{{ row.current_level }}级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="direct_members" label="直推人数" width="100" align="center" />
            <el-table-column prop="team_total_members" label="团队总人数" width="120" align="center" />
            <el-table-column prop="team_performance" label="团队业绩 (USDT)" width="150" align="right">
              <template #default="{ row }">
                <span class="amount-text">{{ formatAmount(row.team_performance) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total_dividend" label="累计分红 (USDT)" width="150" align="right">
              <template #default="{ row }">
                <span class="amount-text">{{ formatAmount(row.total_dividend) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="last_dividend_date" label="最后分红日期" width="120" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewTeamDetail(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="teamPagination.page"
            v-model:page-size="teamPagination.pageSize"
            :total="teamPagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadTeams"
            @size-change="loadTeams"
            class="pagination"
          />
        </el-tab-pane>

        <!-- 分红记录 -->
        <el-tab-pane label="分红记录" name="records">
          <div class="filter-bar">
            <el-form :inline="true">
              <el-form-item label="钱包地址">
                <el-input v-model="recordFilters.wallet" placeholder="输入钱包地址" clearable />
              </el-form-item>
              <el-form-item label="等级">
                <el-select v-model="recordFilters.level" clearable>
                  <el-option label="全部" :value="null" />
                  <el-option label="1级" :value="1" />
                  <el-option label="2级" :value="2" />
                  <el-option label="3级" :value="3" />
                  <el-option label="4级" :value="4" />
                  <el-option label="5级" :value="5" />
                </el-select>
              </el-form-item>
              <el-form-item label="日期范围">
                <el-date-picker
                  v-model="recordDateRange"
                  type="daterange"
                  range-separator="至"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadRecords">查询</el-button>
                <el-button @click="resetRecordFilters">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="records" border stripe v-loading="loading">
            <el-table-column prop="wallet_address" label="钱包地址" width="180">
              <template #default="{ row }">
                <span class="wallet-addr">{{ formatAddress(row.wallet_address) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="broker_level" label="等级" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.broker_level)">{{ row.broker_level }}级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reward_amount" label="分红金额 (USDT)" width="150" align="right">
              <template #default="{ row }">
                <span class="amount-text">{{ formatAmount(row.reward_amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reward_date" label="分红日期" width="120" />
            <el-table-column prop="created_at" label="发放时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="recordPagination.page"
            v-model:page-size="recordPagination.pageSize"
            :total="recordPagination.total"
            :page-sizes="[20, 50, 100, 200]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadRecords"
            @size-change="loadRecords"
            class="pagination"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 成员详情弹窗 -->
    <TeamMemberDetailDialog
      v-model="memberDetailVisible"
      :wallet-address="selectedMemberAddress"
      @compensate="handleCompensateFromDetail"
    />

    <!-- 补发分红对话框 -->
    <el-dialog v-model="compensateDialogVisible" title="补发分红" width="500px">
      <el-form :model="compensateForm" label-width="120px">
        <el-form-item label="钱包地址">
          <el-input v-model="compensateForm.wallet_address" disabled />
        </el-form-item>
        <el-form-item label="经纪人等级">
          <el-select v-model="compensateForm.broker_level">
            <el-option label="1级" :value="1" />
            <el-option label="2级" :value="2" />
            <el-option label="3级" :value="3" />
            <el-option label="4级" :value="4" />
            <el-option label="5级" :value="5" />
          </el-select>
        </el-form-item>
        <el-form-item label="分红金额">
          <el-input-number v-model="compensateForm.reward_amount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="分红日期">
          <el-date-picker v-model="compensateForm.reward_date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="补发原因">
          <el-input v-model="compensateForm.reason" type="textarea" :rows="3" placeholder="请输入补发原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="compensateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCompensate" :loading="compensating">确认补发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Coin, User, Calendar, TrendCharts } from '@element-plus/icons-vue'
import request from '@/api'
import TeamMemberDetailDialog from '@/components/TeamMemberDetailDialog.vue'

const API_BASE = '/team-dividend'

// 数据
const activeTab = ref('members')
const loading = ref(false)
const overview = ref({})
const members = ref([])
const teams = ref([])
const records = ref([])

// 筛选条件
const memberFilters = reactive({
  level: null,
  search: ''
})
const memberDateRange = ref([])

const teamFilters = reactive({
  minMembers: 0,
  minPerformance: 0
})

const recordFilters = reactive({
  wallet: '',
  level: null
})
const recordDateRange = ref([])

// 分页
const memberPagination = reactive({ page: 1, pageSize: 20, total: 0 })
const teamPagination = reactive({ page: 1, pageSize: 20, total: 0 })
const recordPagination = reactive({ page: 1, pageSize: 50, total: 0 })

// 补发对话框
const compensateDialogVisible = ref(false)
const compensating = ref(false)
const compensateForm = reactive({
  wallet_address: '',
  broker_level: 1,
  reward_amount: 0,
  reward_date: '',
  reason: ''
})

// 加载概览数据
const loadOverview = async () => {
  try {
    const data = await request.get(`${API_BASE}/overview`)
    if (data.success) {
      overview.value = data.data
    }
  } catch (error) {
    console.error('加载概览失败:', error)
  }
}

// 加载成员数据
const loadMembers = async () => {
  loading.value = true
  try {
    const params = {
      page: memberPagination.page,
      pageSize: memberPagination.pageSize,
      level: memberFilters.level,
      search: memberFilters.search
    }
    if (memberDateRange.value?.length === 2) {
      params.startDate = memberDateRange.value[0]
      params.endDate = memberDateRange.value[1]
    }
    console.log('[TeamDividend] 请求参数:', params)
    const data = await request.get(`${API_BASE}/members`, { params })
    console.log('[TeamDividend] API响应:', data)
    if (data.success) {
      members.value = data.data.members
      memberPagination.total = data.data.pagination.total
      console.log('[TeamDividend] 成员数据:', members.value)
    }
  } catch (error) {
    console.error('[TeamDividend] 加载失败:', error)
    ElMessage.error('加载成员数据失败')
  } finally {
    loading.value = false
  }
}

// 加载团队数据
const loadTeams = async () => {
  loading.value = true
  try {
    const params = {
      page: teamPagination.page,
      pageSize: teamPagination.pageSize,
      minMembers: teamFilters.minMembers,
      minPerformance: teamFilters.minPerformance
    }
    const data = await request.get(`${API_BASE}/teams`, { params })
    if (data.success) {
      teams.value = data.data.teams
      teamPagination.total = data.data.pagination.total
    }
  } catch (error) {
    ElMessage.error('加载团队数据失败')
  } finally {
    loading.value = false
  }
}

// 加载记录数据
const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: recordPagination.page,
      pageSize: recordPagination.pageSize,
      wallet: recordFilters.wallet,
      level: recordFilters.level
    }
    if (recordDateRange.value?.length === 2) {
      params.startDate = recordDateRange.value[0]
      params.endDate = recordDateRange.value[1]
    }
    const data = await request.get(`${API_BASE}/records`, { params })
    if (data.success) {
      records.value = data.data.records
      recordPagination.total = data.data.pagination.total
    }
  } catch (error) {
    ElMessage.error('加载记录失败')
  } finally {
    loading.value = false
  }
}

// Tab切换
const handleTabChange = (tab) => {
  if (tab === 'members') loadMembers()
  else if (tab === 'teams') loadTeams()
  else if (tab === 'records') loadRecords()
}

// 重置筛选
const resetMemberFilters = () => {
  memberFilters.level = null
  memberFilters.search = ''
  memberDateRange.value = []
  loadMembers()
}

const resetTeamFilters = () => {
  teamFilters.minMembers = 0
  teamFilters.minPerformance = 0
  loadTeams()
}

const resetRecordFilters = () => {
  recordFilters.wallet = ''
  recordFilters.level = null
  recordDateRange.value = []
  loadRecords()
}

// 显示补发对话框
const showCompensateDialog = (row) => {
  compensateForm.wallet_address = row.wallet_address
  compensateForm.broker_level = row.current_level || 1
  compensateForm.reward_amount = 0
  compensateForm.reward_date = new Date().toISOString().slice(0, 10)
  compensateForm.reason = ''
  compensateDialogVisible.value = true
}

// 补发分红
const handleCompensate = async () => {
  if (!compensateForm.reward_amount || compensateForm.reward_amount <= 0) {
    ElMessage.warning('请输入有效的分红金额')
    return
  }
  if (!compensateForm.reward_date) {
    ElMessage.warning('请选择分红日期')
    return
  }
  
  compensating.value = true
  try {
    const data = await request.post(`${API_BASE}/compensate`, compensateForm)
    if (data.success) {
      ElMessage.success('补发成功')
      compensateDialogVisible.value = false
      loadMembers()
      loadOverview()
    } else {
      ElMessage.error(data.message || '补发失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '补发失败')
  } finally {
    compensating.value = false
  }
}

// 成员详情弹窗
const memberDetailVisible = ref(false)
const selectedMemberAddress = ref('')

// 查看成员详情
const viewMemberDetail = (row) => {
  selectedMemberAddress.value = row.wallet_address
  memberDetailVisible.value = true
}

// 从详情弹窗触发补发
const handleCompensateFromDetail = (memberData) => {
  memberDetailVisible.value = false
  showCompensateDialog({ wallet_address: memberData.wallet_address, current_level: memberData.current_level })
}

// 查看团队详情
const viewTeamDetail = (row) => {
  ElMessageBox.alert(`团队领导人: ${row.leader_address}<br>查看详情功能开发中...`, '团队详情', {
    dangerouslyUseHTMLString: true
  })
}

// 工具函数
const formatAddress = (addr) => {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2)
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleString('zh-CN')
}

const getLevelType = (level) => {
  const types = ['info', 'success', 'warning', 'danger', 'danger', 'danger']
  return types[level] || 'info'
}

// 初始化
onMounted(() => {
  loadOverview()
  loadMembers()
})
</script>

<style scoped>
.team-dividend-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-card h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px var(--admin-shadow-color, rgba(0,0,0,0.15));
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 40px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--admin-text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--admin-text-secondary);
  margin-top: 5px;
}

.main-card {
  margin-top: 20px;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--admin-bg-color);
  border-radius: 4px;
}

.wallet-addr {
  font-family: 'Courier New', monospace;
  cursor: pointer;
  color: var(--admin-text-regular);
}

.amount-text {
  font-weight: 600;
  color: var(--admin-success);
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
