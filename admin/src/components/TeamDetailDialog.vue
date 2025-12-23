<template>
  <el-dialog
    v-model="visible"
    title="团队详情"
    width="1000px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="team-detail">
      <!-- 团队领导人信息 -->
      <el-card class="info-card leader-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Avatar /></el-icon>
            <span>团队领导人</span>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="钱包地址" :span="3">
            <div class="wallet-display">
              <code class="wallet-addr">{{ teamData.leader_address }}</code>
              <el-button type="primary" link size="small" @click="copyText(teamData.leader_address)">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="经纪人等级">
            <el-tag :type="getLevelType(teamData.current_level)" size="large">
              {{ teamData.current_level || 0 }}级经纪人
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="邀请码">
            <el-tag type="primary">{{ teamData.referral_code || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDateTime(teamData.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 团队数据统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon primary">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ teamData.direct_members || 0 }}</div>
              <div class="stat-label">直推人数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon success">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ teamData.team_total_members || 0 }}</div>
              <div class="stat-label">团队总人数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon warning">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatAmount(teamData.team_performance) }}</div>
              <div class="stat-label">团队业绩 (USDT)</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon danger">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatAmount(teamData.total_dividend) }}</div>
              <div class="stat-label">累计分红 (USDT)</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 等级达成条件 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Medal /></el-icon>
            <span>等级达成进度</span>
          </div>
        </template>
        <el-table :data="levelProgress" border stripe size="small">
          <el-table-column prop="level" label="目标等级" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.achieved ? 'success' : 'info'" size="small">
                {{ row.level }}级
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="直推要求" width="160">
            <template #default="{ row }">
              <div class="progress-item">
                <span :class="{ 'achieved': row.directAchieved }">
                  {{ teamData.direct_members || 0 }} / {{ row.directRequired }}
                </span>
                <el-icon v-if="row.directAchieved" class="check-icon"><Check /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="下级经纪人" width="160">
            <template #default="{ row }">
              <div class="progress-item" v-if="row.subBrokerRequired > 0">
                <span :class="{ 'achieved': row.subBrokerAchieved }">
                  {{ row.subBrokerCount }} / {{ row.subBrokerRequired }}名{{ row.subBrokerLevel }}级
                </span>
                <el-icon v-if="row.subBrokerAchieved" class="check-icon"><Check /></el-icon>
              </div>
              <span v-else class="no-require">无要求</span>
            </template>
          </el-table-column>
          <el-table-column label="团队业绩" width="180">
            <template #default="{ row }">
              <div class="progress-item">
                <span :class="{ 'achieved': row.performanceAchieved }">
                  {{ formatAmount(teamData.team_performance || 0) }} / {{ formatAmount(row.performanceRequired) }}
                </span>
                <el-icon v-if="row.performanceAchieved" class="check-icon"><Check /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="每日分红" width="120" align="right">
            <template #default="{ row }">
              <span class="amount">{{ row.dailyDividend }} USDT</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.achieved ? 'success' : 'danger'" size="small">
                {{ row.achieved ? '已达成' : '未达成' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 直推成员列表 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Connection /></el-icon>
            <span>直推成员 ({{ directMembers.length }})</span>
          </div>
        </template>
        <el-table :data="directMembers" border stripe max-height="300" size="small">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="wallet_address" label="钱包地址" min-width="180">
            <template #default="{ row }">
              <span class="wallet-addr-short">{{ formatAddress(row.wallet_address) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="broker_level" label="经纪人等级" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.broker_level > 0" :type="getLevelType(row.broker_level)" size="small">
                {{ row.broker_level }}级
              </el-tag>
              <span v-else class="no-level">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="robot_count" label="机器人数" width="100" align="center" />
          <el-table-column prop="total_investment" label="总投资" width="130" align="right">
            <template #default="{ row }">
              <span :class="{ 'qualified': parseFloat(row.total_investment) >= 20 }">
                {{ formatAmount(row.total_investment) }} USDT
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="sub_count" label="下级数" width="80" align="center" />
          <el-table-column prop="created_at" label="加入时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 分红记录 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><List /></el-icon>
            <span>分红记录 (近30条)</span>
          </div>
        </template>
        <el-table :data="dividendRecords" border stripe max-height="250" size="small">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="broker_level" label="等级" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getLevelType(row.broker_level)" size="small">
                {{ row.broker_level }}级
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reward_amount" label="分红金额" width="130" align="right">
            <template #default="{ row }">
              <span class="amount">{{ formatAmount(row.reward_amount) }} USDT</span>
            </template>
          </el-table-column>
          <el-table-column prop="reward_date" label="分红日期" width="120" />
          <el-table-column prop="created_at" label="发放时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="reward_type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.reward_type === 'daily_dividend'" type="success" size="small">
                每日分红
              </el-tag>
              <el-tag v-else-if="row.reward_type === 'compensation'" type="warning" size="small">
                补发
              </el-tag>
              <el-tag v-else type="info" size="small">{{ row.reward_type }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="viewMemberDetail">
        <el-icon><User /></el-icon>
        查看成员详情
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * Team Detail Dialog Component
 * Displays comprehensive team information including leader, stats, level progress, and members
 */
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Avatar, User, UserFilled, Coin, TrendCharts, Medal, 
  Connection, List, CopyDocument, Check 
} from '@element-plus/icons-vue'
import request from '@/api'

// Broker level requirements (from company document)
const BROKER_LEVELS = [
  { level: 0, directRequired: 0, subBrokerRequired: 0, subBrokerLevel: 0, performanceRequired: 0, dailyDividend: 0 },
  { level: 1, directRequired: 5, subBrokerRequired: 0, subBrokerLevel: 0, performanceRequired: 1000, dailyDividend: 5 },
  { level: 2, directRequired: 10, subBrokerRequired: 2, subBrokerLevel: 1, performanceRequired: 5000, dailyDividend: 15 },
  { level: 3, directRequired: 20, subBrokerRequired: 2, subBrokerLevel: 2, performanceRequired: 20000, dailyDividend: 60 },
  { level: 4, directRequired: 30, subBrokerRequired: 2, subBrokerLevel: 3, performanceRequired: 80000, dailyDividend: 300 },
  { level: 5, directRequired: 50, subBrokerRequired: 2, subBrokerLevel: 4, performanceRequired: 200000, dailyDividend: 1000 }
]

// Props
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  leaderAddress: { type: String, default: '' }
})

// Emits
const emit = defineEmits(['update:modelValue', 'viewMember'])

// Data
const loading = ref(false)
const visible = ref(false)
const teamData = ref({})
const directMembers = ref([])
const dividendRecords = ref([])
const subBrokerCounts = ref({})

// Calculate level progress
const levelProgress = computed(() => {
  const direct = teamData.value.direct_members || 0
  const performance = parseFloat(teamData.value.team_performance) || 0
  const currentLevel = teamData.value.current_level || 0
  
  return BROKER_LEVELS.slice(1).map(config => {
    const subBrokerCount = subBrokerCounts.value[config.subBrokerLevel] || 0
    const directAchieved = direct >= config.directRequired
    const subBrokerAchieved = config.subBrokerRequired === 0 || subBrokerCount >= config.subBrokerRequired
    const performanceAchieved = performance > config.performanceRequired
    const achieved = directAchieved && subBrokerAchieved && performanceAchieved
    
    return {
      ...config,
      subBrokerCount,
      directAchieved,
      subBrokerAchieved,
      performanceAchieved,
      achieved
    }
  })
})

// Watch visibility
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.leaderAddress) {
    loadTeamDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

/**
 * Load team detail data
 */
const loadTeamDetail = async () => {
  loading.value = true
  try {
    // Get team leader info and statistics
    const detailRes = await request.get(`/team-dividend/member/${props.leaderAddress}`)
    if (detailRes.success) {
      teamData.value = {
        ...detailRes.data,
        leader_address: props.leaderAddress
      }
    }

    // Get direct members with broker level info
    const membersRes = await request.get(`/team-dividend/member/${props.leaderAddress}/direct-members`)
    if (membersRes.success) {
      directMembers.value = membersRes.data.members || []
      
      // Count sub-brokers by level
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      directMembers.value.forEach(member => {
        const level = member.broker_level || 0
        if (level >= 1 && level <= 5) {
          counts[level]++
        }
      })
      subBrokerCounts.value = counts
    }

    // Get dividend records
    const recordsRes = await request.get('/team-dividend/records', {
      params: {
        wallet: props.leaderAddress,
        page: 1,
        pageSize: 30
      }
    })
    if (recordsRes.success) {
      dividendRecords.value = recordsRes.data.records || []
    }
  } catch (error) {
    console.error('加载团队详情失败:', error)
    ElMessage.error('加载团队详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * Close dialog
 */
const handleClose = () => {
  visible.value = false
}

/**
 * View member detail
 */
const viewMemberDetail = () => {
  emit('viewMember', teamData.value)
  handleClose()
}

/**
 * Copy text to clipboard
 */
const copyText = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

/**
 * Format wallet address
 */
const formatAddress = (addr) => {
  if (!addr) return '-'
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

/**
 * Format amount
 */
const formatAmount = (amount) => {
  const num = parseFloat(amount || 0)
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

/**
 * Format datetime
 */
const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleString('zh-CN')
}

/**
 * Get level tag type
 */
const getLevelType = (level) => {
  const types = { 1: 'info', 2: 'success', 3: 'warning', 4: 'danger', 5: 'danger' }
  return types[level] || 'info'
}
</script>

<style scoped>
.team-detail {
  padding: 10px 0;
}

.info-card {
  margin-bottom: 20px;
}

.info-card:last-child {
  margin-bottom: 0;
}

.leader-card {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 194, 58, 0.05) 100%);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

.wallet-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wallet-addr {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: var(--admin-bg-color);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
  color: var(--admin-text-regular);
}

.wallet-addr-short {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--admin-text-regular);
}

/* Statistics cards */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--admin-card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--admin-border-color-light);
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  margin-right: 14px;
}

.stat-icon .el-icon {
  font-size: 22px;
  color: #ffffff;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
}

.stat-icon.success {
  background: linear-gradient(135deg, #67C23A 0%, #95d475 100%);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #E6A23C 0%, #f3d19e 100%);
}

.stat-icon.danger {
  background: linear-gradient(135deg, #F56C6C 0%, #fab6b6 100%);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--admin-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--admin-text-secondary);
  margin-top: 4px;
}

/* Level progress */
.progress-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-item .achieved {
  color: #67C23A;
  font-weight: 600;
}

.check-icon {
  color: #67C23A;
  font-size: 14px;
}

.no-require {
  color: var(--admin-text-secondary);
  font-size: 12px;
}

.no-level {
  color: var(--admin-text-disabled);
}

/* Amount styling */
.amount {
  font-weight: 600;
  color: #67C23A;
}

.qualified {
  color: #67C23A;
  font-weight: 600;
}
</style>

