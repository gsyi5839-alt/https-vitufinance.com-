<template>
  <el-dialog
    v-model="visible"
    title="成员详情"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="member-detail">
      <!-- 基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="钱包地址" :span="2">
            <div class="wallet-display">
              <code class="wallet-addr">{{ memberData.wallet_address }}</code>
              <el-button
                type="primary"
                link
                size="small"
                @click="copyText(memberData.wallet_address)"
              >
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="当前等级">
            <el-tag :type="getLevelType(memberData.current_level)" size="large">
              {{ memberData.current_level }}级经纪人
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="邀请码">
            <el-tag type="primary">{{ memberData.referral_code || '-' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 团队统计 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><UserFilled /></el-icon>
            <span>团队统计</span>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">直推人数</div>
              <div class="stat-value">{{ memberData.direct_members || 0 }}</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">合格成员</div>
              <div class="stat-value success">{{ memberData.qualified_members || 0 }}</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">团队总人数</div>
              <div class="stat-value">{{ memberData.team_total || 0 }}</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 分红信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Coin /></el-icon>
            <span>分红信息</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="累计分红">
            <span class="amount-text">{{ formatAmount(memberData.total_dividend) }} USDT</span>
          </el-descriptions-item>
          <el-descriptions-item label="分红次数">
            <el-tag>{{ memberData.dividend_records || 0 }} 次</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后分红日期">
            {{ memberData.last_dividend_date || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="最后分红时间">
            {{ formatDateTime(memberData.last_dividend_time) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 分红记录列表 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><List /></el-icon>
            <span>分红记录</span>
          </div>
        </template>
        <el-table :data="dividendRecords" border stripe max-height="300">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="broker_level" label="等级" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getLevelType(row.broker_level)" size="small">
                {{ row.broker_level }}级
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reward_amount" label="分红金额" width="150" align="right">
            <template #default="{ row }">
              <span class="amount-text">{{ formatAmount(row.reward_amount) }} USDT</span>
            </template>
          </el-table-column>
          <el-table-column prop="reward_date" label="分红日期" width="120" />
          <el-table-column prop="created_at" label="发放时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="reward_type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.reward_type === 'daily_dividend'" type="success" size="small">
                每日分红
              </el-tag>
              <el-tag v-else type="info" size="small">
                {{ row.reward_type }}
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
        <el-table :data="directMembers" border stripe max-height="300">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="wallet_address" label="钱包地址" min-width="180">
            <template #default="{ row }">
              <span class="wallet-addr-short">{{ formatAddress(row.wallet_address) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="robot_count" label="机器人数" width="100" align="center" />
          <el-table-column prop="total_investment" label="总投资" width="150" align="right">
            <template #default="{ row }">
              <span class="amount">{{ formatAmount(row.total_investment) }} USDT</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="加入时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="$emit('compensate', memberData)">
        <el-icon><Coin /></el-icon>
        补发分红
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { User, UserFilled, Coin, List, Connection, CopyDocument } from '@element-plus/icons-vue'
import request from '@/api'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  walletAddress: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'compensate'])

// 数据
const loading = ref(false)
const visible = ref(false)
const memberData = ref({})
const dividendRecords = ref([])
const directMembers = ref([])

// 监听显示状态
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.walletAddress) {
    loadMemberDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

/**
 * 加载成员详情
 */
const loadMemberDetail = async () => {
  loading.value = true
  try {
    // 获取基本信息和团队统计
    const detailRes = await request.get(`/team-dividend/member/${props.walletAddress}`)
    if (detailRes.success) {
      memberData.value = detailRes.data
    }

    // 获取分红记录
    const recordsRes = await request.get('/team-dividend/records', {
      params: {
        wallet: props.walletAddress,
        page: 1,
        pageSize: 50
      }
    })
    if (recordsRes.success) {
      dividendRecords.value = recordsRes.data.records
    }

    // 获取直推成员
    const membersRes = await request.get(`/team-dividend/member/${props.walletAddress}/direct-members`)
    if (membersRes.success) {
      directMembers.value = membersRes.data.members
    }
  } catch (error) {
    console.error('加载成员详情失败:', error)
    ElMessage.error('加载详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 关闭弹窗
 */
const handleClose = () => {
  visible.value = false
}

/**
 * 复制文本
 */
const copyText = (text) => {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

/**
 * 格式化地址
 */
const formatAddress = (addr) => {
  if (!addr) return '-'
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
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
const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleString('zh-CN')
}

/**
 * 获取等级类型
 */
const getLevelType = (level) => {
  const types = {
    1: 'info',
    2: 'success',
    3: 'warning',
    4: 'danger',
    5: 'danger'
  }
  return types[level] || 'info'
}
</script>

<style scoped>
.member-detail {
  padding: 10px 0;
}

.info-card {
  margin-bottom: 20px;
}

.info-card:last-child {
  margin-bottom: 0;
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

.stat-item {
  text-align: center;
  padding: 20px;
  background: var(--admin-bg-color);
  border-radius: 8px;
}

.stat-label {
  font-size: 13px;
  color: var(--admin-text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--admin-primary);
}

.stat-value.success {
  color: var(--admin-success);
}

.amount-text {
  font-weight: 600;
  color: var(--admin-success);
  font-size: 14px;
}

.amount {
  font-weight: 600;
  color: var(--admin-primary);
}
</style>

