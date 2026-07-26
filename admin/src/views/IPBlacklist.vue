<!--
  IP封禁管理页面
  Features:
  - View blocked IPs list
  - Block/unblock IPs manually
  - Manage IP whitelist
  - View attack logs and statistics
-->
<template>
  <div class="ip-blacklist-page">
    <div class="page-header">
      <h1>IP封禁管理</h1>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="danger" @click="showBlockDialog = true">
          <el-icon><Lock /></el-icon>
          封禁IP
        </el-button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-cards">
      <el-card class="stat-card blocked">
        <div class="stat-icon">🚫</div>
        <div class="stat-info">
          <div class="stat-label">已封禁IP</div>
          <div class="stat-value">{{ stats.blockedIPs }}</div>
          <div class="stat-extra">持久 {{ stats.persistentBlockedIPs }} / 临时 {{ stats.temporaryBlockedIPs }}</div>
        </div>
      </el-card>

      <el-card class="stat-card attacks">
        <div class="stat-icon">⚔️</div>
        <div class="stat-info">
          <div class="stat-label">今日攻击</div>
          <div class="stat-value">{{ stats.todayAttacks }}</div>
        </div>
      </el-card>

      <el-card class="stat-card critical">
        <div class="stat-icon">🔥</div>
        <div class="stat-info">
          <div class="stat-label">严重攻击</div>
          <div class="stat-value">{{ stats.criticalAttacks }}</div>
        </div>
      </el-card>

      <el-card class="stat-card tracked">
        <div class="stat-icon">👁️</div>
        <div class="stat-info">
          <div class="stat-label">监控IP数</div>
          <div class="stat-value">{{ stats.trackedIPs }}</div>
        </div>
      </el-card>
    </div>

    <!-- Tabs for different views -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- Blocked IPs Tab -->
      <el-tab-pane label="封禁列表" name="blocked">
        <el-card class="table-card">
          <el-table :data="blockedIPs" v-loading="loading" stripe>
            <el-table-column prop="ip" label="IP地址" width="180">
              <template #default="{ row }">
                <span class="ip-address">{{ row.ip }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="封禁时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.blockedAt) }}
              </template>
            </el-table-column>

            <el-table-column label="剩余时间" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.permanent" type="danger" size="small">永久</el-tag>
                <span v-else class="remaining-time">{{ row.remainingTime }}s</span>
              </template>
            </el-table-column>

            <el-table-column label="来源" width="110">
              <template #default="{ row }">
                <el-tag :type="getBlockSourceTag(row.source)" size="small">
                  {{ getBlockSourceLabel(row.source) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="reason" label="封禁原因" min-width="200" />

            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="success" size="small" @click="handleUnblock(row.ip)">
                  解封
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Attack Logs Tab -->
      <el-tab-pane label="攻击日志" name="attacks">
        <el-card class="filter-card">
          <el-form :inline="true" :model="attackFilters">
            <el-form-item label="攻击类型">
              <el-select v-model="attackFilters.type" placeholder="全部" clearable 
                         @change="fetchAttackLogs" style="width: 150px">
                <el-option label="SQL注入" value="sql_injection" />
                <el-option label="XSS攻击" value="xss" />
                <el-option label="暴力破解" value="brute_force" />
                <el-option label="速率限制" value="rate_limit" />
                <el-option label="机器人" value="bot_detection" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>

            <el-form-item label="严重程度">
              <el-select v-model="attackFilters.severity" placeholder="全部" clearable 
                         @change="fetchAttackLogs" style="width: 120px">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="严重" value="critical" />
              </el-select>
            </el-form-item>

            <el-form-item label="IP搜索">
              <el-input v-model="attackFilters.ip" placeholder="输入IP地址" clearable
                        @keyup.enter="fetchAttackLogs" style="width: 180px" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card">
          <el-table :data="attackLogs" v-loading="loadingAttacks" stripe>
            <el-table-column prop="id" label="ID" width="80" />
            
            <el-table-column prop="ip_address" label="IP地址" width="150">
              <template #default="{ row }">
                <span class="ip-address">{{ row.ip_address }}</span>
              </template>
            </el-table-column>

            <el-table-column label="攻击类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getAttackTypeTag(row.attack_type)" size="small">
                  {{ getAttackTypeLabel(row.attack_type) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="严重程度" width="100">
              <template #default="{ row }">
                <el-tag :type="getSeverityTag(row.severity)" size="small">
                  {{ getSeverityLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="request_path" label="请求路径" min-width="200">
              <template #default="{ row }">
                <span class="request-path">{{ row.request_method }} {{ row.request_path }}</span>
              </template>
            </el-table-column>

            <el-table-column label="已封禁" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.blocked" type="danger" size="small">是</el-tag>
                <el-tag v-else type="info" size="small">否</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="handleBlockFromLog(row.ip_address)">
                  封禁
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="attackPage"
              :page-size="20"
              :total="attackTotal"
              layout="total, prev, pager, next"
              @current-change="fetchAttackLogs"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Whitelist Tab -->
      <el-tab-pane label="IP白名单" name="whitelist">
        <el-card class="table-card">
          <div class="whitelist-header">
            <el-button type="success" @click="showWhitelistDialog = true">
              <el-icon><Plus /></el-icon>
              添加白名单
            </el-button>
          </div>

          <el-table :data="whitelist" v-loading="loadingWhitelist" stripe>
            <el-table-column prop="ip_address" label="IP地址" width="180">
              <template #default="{ row }">
                <span class="ip-address">{{ row.ip_address }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="description" label="描述" min-width="200" />
            
            <el-table-column prop="added_by" label="添加者" width="120" />

            <el-table-column label="添加时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="handleRemoveWhitelist(row.ip_address)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Block IP Dialog -->
    <el-dialog v-model="showBlockDialog" title="封禁IP" width="500px">
      <el-form :model="blockForm" label-width="100px">
        <el-form-item label="IP地址" required>
          <el-input v-model="blockForm.ip" placeholder="输入要封禁的IP地址" />
        </el-form-item>

        <el-form-item label="封禁时长">
          <el-select v-model="blockForm.duration" style="width: 100%">
            <el-option label="5分钟" :value="5 * 60 * 1000" />
            <el-option label="15分钟" :value="15 * 60 * 1000" />
            <el-option label="1小时" :value="60 * 60 * 1000" />
            <el-option label="24小时" :value="24 * 60 * 60 * 1000" />
            <el-option label="7天" :value="7 * 24 * 60 * 60 * 1000" />
            <el-option label="永久" :value="-1" />
          </el-select>
        </el-form-item>

        <el-form-item label="封禁原因">
          <el-input v-model="blockForm.reason" type="textarea" rows="3" 
                    placeholder="输入封禁原因（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBlockDialog = false">取消</el-button>
        <el-button type="danger" @click="handleBlock" :loading="blocking">确认封禁</el-button>
      </template>
    </el-dialog>

    <!-- Add Whitelist Dialog -->
    <el-dialog v-model="showWhitelistDialog" title="添加白名单" width="500px">
      <el-form :model="whitelistForm" label-width="100px">
        <el-form-item label="IP地址" required>
          <el-input v-model="whitelistForm.ip" placeholder="输入IP地址" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="whitelistForm.description" type="textarea" rows="2" 
                    placeholder="输入描述（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showWhitelistDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddWhitelist" :loading="addingWhitelist">
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * IP Blacklist Management Page
 * Features: Block/unblock IPs, view attack logs, manage whitelist
 */
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Lock, Plus } from '@element-plus/icons-vue'
import request from '@/api'
import dayjs from 'dayjs'

// ==================== State ====================

const loading = ref(false)
const loadingAttacks = ref(false)
const loadingWhitelist = ref(false)
const blocking = ref(false)
const addingWhitelist = ref(false)

const activeTab = ref('blocked')

// Statistics
const stats = reactive({
  blockedIPs: 0,
  persistentBlockedIPs: 0,
  temporaryBlockedIPs: 0,
  todayAttacks: 0,
  criticalAttacks: 0,
  trackedIPs: 0
})

// Blocked IPs list
const blockedIPs = ref([])

// Attack logs
const attackLogs = ref([])
const attackPage = ref(1)
const attackTotal = ref(0)
const attackFilters = reactive({
  type: '',
  severity: '',
  ip: ''
})

// Whitelist
const whitelist = ref([])

// Dialogs
const showBlockDialog = ref(false)
const showWhitelistDialog = ref(false)

// Forms
const blockForm = reactive({
  ip: '',
  duration: 60 * 60 * 1000, // Default 1 hour
  reason: ''
})

const whitelistForm = reactive({
  ip: '',
  description: ''
})

// Auto refresh timer
let refreshTimer = null

// ==================== API Calls ====================

/**
 * Fetch security statistics
 */
const fetchStats = async () => {
  try {
    const res = await request.get('/security/stats')
    if (res.success) {
      const data = res.data
      stats.blockedIPs = data.ipProtection?.blockedIPs || 0
      stats.persistentBlockedIPs = data.ipProtection?.persistentBlockedIPs || 0
      stats.temporaryBlockedIPs = data.ipProtection?.temporaryBlockedIPs || 0
      stats.trackedIPs = data.ipProtection?.trackedIPs || 0
      stats.todayAttacks = data.attacks?.total || 0
      stats.criticalAttacks = (data.attacks?.critical || 0) + (data.attacks?.high || 0)
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

/**
 * Fetch blocked IPs list
 */
const fetchBlockedIPs = async () => {
  loading.value = true
  try {
    const res = await request.get('/security/blocked-ips')
    if (res.success) {
      blockedIPs.value = res.data || []
    }
  } catch (error) {
    console.error('Failed to fetch blocked IPs:', error)
  } finally {
    loading.value = false
  }
}

/**
 * Fetch attack logs
 */
const fetchAttackLogs = async () => {
  loadingAttacks.value = true
  try {
    const params = {
      limit: 100
    }
    if (attackFilters.type) params.type = attackFilters.type
    if (attackFilters.severity) params.severity = attackFilters.severity
    if (attackFilters.ip) params.ip = attackFilters.ip

    const res = await request.get('/security/attacks', { params })
    if (res.success) {
      attackLogs.value = res.data || []
      attackTotal.value = attackLogs.value.length
    }
  } catch (error) {
    console.error('Failed to fetch attack logs:', error)
  } finally {
    loadingAttacks.value = false
  }
}

/**
 * Fetch whitelist
 */
const fetchWhitelist = async () => {
  loadingWhitelist.value = true
  try {
    const res = await request.get('/security/whitelist')
    if (res.success) {
      whitelist.value = res.data || []
    }
  } catch (error) {
    // Whitelist might not exist yet
    whitelist.value = []
  } finally {
    loadingWhitelist.value = false
  }
}

/**
 * Block an IP
 */
const handleBlock = async () => {
  if (!blockForm.ip) {
    ElMessage.warning('请输入IP地址')
    return
  }

  blocking.value = true
  try {
    const res = await request.post('/security/block-ip', {
      ip: blockForm.ip,
      duration: blockForm.duration === -1 ? null : blockForm.duration,
      reason: blockForm.reason || '管理员手动封禁',
      permanent: blockForm.duration === -1
    })

    if (res.success) {
      ElMessage.success(`IP ${blockForm.ip} 已被封禁`)
      showBlockDialog.value = false
      blockForm.ip = ''
      blockForm.reason = ''
      await fetchBlockedIPs()
      await fetchStats()
    } else {
      ElMessage.error(res.message || '封禁失败')
    }
  } catch (error) {
    ElMessage.error('封禁失败')
  } finally {
    blocking.value = false
  }
}

/**
 * Block IP from attack log
 */
const handleBlockFromLog = async (ip) => {
  try {
    await ElMessageBox.confirm(`确定要封禁IP ${ip} 吗？`, '确认封禁', {
      type: 'warning'
    })

    const res = await request.post('/security/block-ip', {
      ip,
      duration: 24 * 60 * 60 * 1000, // 24 hours
      reason: '从攻击日志手动封禁'
    })

    if (res.success) {
      ElMessage.success(`IP ${ip} 已被封禁`)
      await fetchBlockedIPs()
      await fetchAttackLogs()
      await fetchStats()
    } else {
      ElMessage.error(res.message || '封禁失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('封禁失败')
    }
  }
}

/**
 * Unblock an IP
 */
const handleUnblock = async (ip) => {
  try {
    await ElMessageBox.confirm(`确定要解封IP ${ip} 吗？`, '确认解封', {
      type: 'info'
    })

    const res = await request.post('/security/unblock-ip', { ip })

    if (res.success) {
      ElMessage.success(`IP ${ip} 已解封`)
      await fetchBlockedIPs()
      await fetchStats()
    } else {
      ElMessage.error(res.message || '解封失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('解封失败')
    }
  }
}

/**
 * Add IP to whitelist
 */
const handleAddWhitelist = async () => {
  if (!whitelistForm.ip) {
    ElMessage.warning('请输入IP地址')
    return
  }

  addingWhitelist.value = true
  try {
    const res = await request.post('/security/whitelist', {
      ip: whitelistForm.ip,
      description: whitelistForm.description || ''
    })

    if (res.success) {
      ElMessage.success(`IP ${whitelistForm.ip} 已加入白名单`)
      showWhitelistDialog.value = false
      whitelistForm.ip = ''
      whitelistForm.description = ''
      await fetchWhitelist()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (error) {
    ElMessage.error('添加失败')
  } finally {
    addingWhitelist.value = false
  }
}

/**
 * Remove IP from whitelist
 */
const handleRemoveWhitelist = async (ip) => {
  try {
    await ElMessageBox.confirm(`确定要将IP ${ip} 从白名单移除吗？`, '确认移除', {
      type: 'warning'
    })

    const res = await request.delete(`/security/whitelist/${encodeURIComponent(ip)}`)

    if (res.success) {
      ElMessage.success(`IP ${ip} 已从白名单移除`)
      await fetchWhitelist()
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败')
    }
  }
}

// ==================== Helpers ====================

/**
 * Format timestamp
 */
const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Get attack type tag color
 */
const getAttackTypeTag = (type) => {
  const map = {
    sql_injection: 'danger',
    xss: 'danger',
    brute_force: 'warning',
    rate_limit: 'info',
    bot_detection: 'warning',
    other: ''
  }
  return map[type] || ''
}

/**
 * Get attack type label
 */
const getAttackTypeLabel = (type) => {
  const map = {
    sql_injection: 'SQL注入',
    xss: 'XSS攻击',
    brute_force: '暴力破解',
    rate_limit: '速率限制',
    bot_detection: '机器人',
    ddos: 'DDoS',
    other: '其他'
  }
  return map[type] || type
}

/**
 * Get severity tag color
 */
const getSeverityTag = (severity) => {
  const map = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  }
  return map[severity] || ''
}

/**
 * Get severity label
 */
const getSeverityLabel = (severity) => {
  const map = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  }
  return map[severity] || severity
}

/**
 * Get block source tag color
 */
const getBlockSourceTag = (source) => {
  const map = {
    temporary: 'warning',
    persistent: 'danger'
  }
  return map[source] || 'info'
}

/**
 * Get block source label
 */
const getBlockSourceLabel = (source) => {
  const map = {
    temporary: '临时',
    persistent: '持久'
  }
  return map[source] || '未知'
}

/**
 * Handle tab change
 */
const handleTabChange = (tab) => {
  if (tab === 'blocked') {
    fetchBlockedIPs()
  } else if (tab === 'attacks') {
    fetchAttackLogs()
  } else if (tab === 'whitelist') {
    fetchWhitelist()
  }
}

/**
 * Refresh all data
 */
const refreshData = async () => {
  await Promise.all([
    fetchStats(),
    fetchBlockedIPs(),
    fetchAttackLogs()
  ])
}

// ==================== Lifecycle ====================

onMounted(() => {
  refreshData()
  fetchWhitelist()
  
  // Auto refresh every 30 seconds
  refreshTimer = setInterval(() => {
    fetchStats()
    if (activeTab.value === 'blocked') {
      fetchBlockedIPs()
    }
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style lang="scss" scoped>
.ip-blacklist-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--admin-text-primary);
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

// Statistics Cards
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  
  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: transparent;
  }
  
  .stat-icon {
    font-size: 32px;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
  }
  
  .stat-info {
    .stat-label {
      font-size: 14px;
      color: var(--admin-text-secondary);
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--admin-text-primary);
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-extra {
      margin-top: 2px;
      font-size: 12px;
      color: var(--admin-text-secondary);
      white-space: nowrap;
    }
  }
  
  &.blocked .stat-icon { background: rgba(245, 108, 108, 0.2); }
  &.attacks .stat-icon { background: rgba(230, 162, 60, 0.2); }
  &.critical .stat-icon { background: rgba(245, 108, 108, 0.2); }
  &.tracked .stat-icon { background: rgba(64, 158, 255, 0.2); }
}

// 暗黑模式下的卡片样式
html.dark .stat-card {
  background: rgba(30, 40, 50, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  :deep(.el-card__body) {
    background: transparent;
  }
  
  .stat-icon {
    background: rgba(255, 255, 255, 0.1);
  }
}

// Filter Card
.filter-card {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  
  :deep(.el-card__body) {
    padding: 16px;
    background: transparent;
  }
  
  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
  }
}

// Table Card
.table-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  
  :deep(.el-card__body) {
    padding: 0;
    background: transparent;
  }
  
  :deep(.el-table) {
    background: transparent;
    
    th.el-table__cell {
      background: rgba(0, 0, 0, 0.03);
    }
    
    tr {
      background: transparent;
    }
    
    .el-table__row:hover > td {
      background: rgba(0, 0, 0, 0.03);
    }
  }
}

// 暗黑模式下的卡片样式
html.dark {
  .filter-card {
    background: rgba(30, 40, 50, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    :deep(.el-card__body) {
      background: transparent;
    }
  }
  
  .table-card {
    background: rgba(30, 40, 50, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    :deep(.el-card__body) {
      background: transparent;
    }
    
    :deep(.el-table) {
      background: transparent;
      
      th.el-table__cell {
        background: rgba(255, 255, 255, 0.05);
      }
      
      tr {
        background: transparent;
      }
      
      .el-table__row:hover > td {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  }
}

// Whitelist header
.whitelist-header {
  padding: 16px;
  border-bottom: 1px solid var(--admin-border-color);
}

// IP Address styling
.ip-address {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--admin-primary);
}

// Request path styling
.request-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--admin-text-secondary);
  word-break: break-all;
}

// Remaining time styling
.remaining-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--admin-warning);
}

// Pagination
.pagination-wrapper {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
}

// Tabs
:deep(.el-tabs__header) {
  margin-bottom: 16px;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: var(--admin-border-color);
}

:deep(.el-tabs__item) {
  color: var(--admin-text-secondary);
  
  &.is-active {
    color: var(--admin-primary);
  }
}

// Responsive
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    .header-actions {
      width: 100%;
      
      .el-button {
        flex: 1;
      }
    }
  }
  
  .filter-card {
    :deep(.el-form) {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    :deep(.el-form-item) {
      margin-right: 0;
      width: 100%;
      
      .el-select, .el-input {
        width: 100% !important;
      }
    }
  }
}
</style>
