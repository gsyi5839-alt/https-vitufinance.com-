<!--
  错误日志监控页面
  功能：
  - 错误日志列表展示
  - 错误统计图表
  - 错误筛选和搜索
  - 错误详情查看
  - 标记已解决
-->
<template>
  <div class="error-logs-page">
    <div class="page-header">
      <h1>错误日志监控</h1>
      <el-button type="primary" @click="refreshData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card error">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-label">错误总数</div>
          <div class="stat-value">{{ stats.errorCount }}</div>
        </div>
      </el-card>

      <el-card class="stat-card critical">
        <div class="stat-icon">🔥</div>
        <div class="stat-info">
          <div class="stat-label">严重错误</div>
          <div class="stat-value">{{ stats.criticalCount }}</div>
        </div>
      </el-card>

      <el-card class="stat-card unresolved">
        <div class="stat-icon">⚠️</div>
        <div class="stat-info">
          <div class="stat-label">未解决</div>
          <div class="stat-value">{{ stats.unresolvedCount }}</div>
        </div>
      </el-card>

      <el-card class="stat-card frontend">
        <div class="stat-icon">🌐</div>
        <div class="stat-info">
          <div class="stat-label">前端错误</div>
          <div class="stat-value">{{ stats.frontendCount }}</div>
        </div>
      </el-card>
    </div>

    <!-- 筛选器 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="错误级别">
          <el-select v-model="filters.level" placeholder="全部" clearable @change="fetchLogs" style="width: 120px">
            <el-option label="Info" value="info"></el-option>
            <el-option label="Warning" value="warning"></el-option>
            <el-option label="Error" value="error"></el-option>
            <el-option label="Critical" value="critical"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="错误来源">
          <el-select v-model="filters.source" placeholder="全部" clearable @change="fetchLogs" style="width: 120px">
            <el-option label="前端" value="frontend"></el-option>
            <el-option label="后端" value="backend"></el-option>
            <el-option label="数据库" value="database"></el-option>
            <el-option label="外部API" value="external_api"></el-option>
            <el-option label="定时任务" value="cron_job"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filters.resolved" placeholder="全部" clearable @change="fetchLogs" style="width: 120px">
            <el-option label="未解决" :value="false"></el-option>
            <el-option label="已解决" :value="true"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
          />
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="错误消息或类型"
            clearable
            @keyup.enter="fetchLogs"
          >
            <template #suffix>
              <el-icon @click="fetchLogs" style="cursor: pointer"><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 错误列表 -->
    <el-card class="table-card">
      <el-table
        :data="errorLogs"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.error_level)" size="small">
              {{ getLevelLabel(row.error_level) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="来源" width="120">
          <template #default="{ row }">
            <el-tag :type="getSourceType(row.error_source)" size="small">
              {{ getSourceLabel(row.error_source) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="error_type" label="类型" width="150" />
        
        <el-table-column label="错误消息" min-width="300">
          <template #default="{ row }">
            <div class="error-message">{{ row.error_message }}</div>
          </template>
        </el-table-column>

        <el-table-column label="发生次数" width="100">
          <template #default="{ row }">
            <el-badge :value="row.occurrence_count" :max="99" />
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.resolved ? 'success' : 'danger'" size="small">
              {{ row.resolved ? '已解决' : '未解决' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="发生时间" width="180" />

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="!row.resolved" 
              type="success" 
              size="small"
              @click.stop="markAsResolved(row)"
            >
              标记已解决
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchLogs"
          @size-change="fetchLogs"
        />
      </div>
    </el-card>

    <!-- 错误详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="错误详情"
      width="80%"
      :close-on-click-modal="false"
      center
      align-center
      append-to-body
    >
      <div v-if="detailDialog.data" class="error-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="错误ID">{{ detailDialog.data.id }}</el-descriptions-item>
          <el-descriptions-item label="错误级别">
            <el-tag :type="getLevelType(detailDialog.data.error_level)">
              {{ getLevelLabel(detailDialog.data.error_level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误来源">
            <el-tag :type="getSourceType(detailDialog.data.error_source)">
              {{ getSourceLabel(detailDialog.data.error_source) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误类型">{{ detailDialog.data.error_type }}</el-descriptions-item>
          <el-descriptions-item label="发生次数">{{ detailDialog.data.occurrence_count }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailDialog.data.resolved ? 'success' : 'danger'">
              {{ detailDialog.data.resolved ? '已解决' : '未解决' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="首次发生">{{ detailDialog.data.first_occurrence }}</el-descriptions-item>
          <el-descriptions-item label="最后发生">{{ detailDialog.data.last_occurrence }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ detailDialog.data.ip_address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="钱包地址">{{ detailDialog.data.wallet_address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="请求方法">{{ detailDialog.data.request_method || '-' }}</el-descriptions-item>
          <el-descriptions-item label="请求URL" :span="2">{{ detailDialog.data.request_url || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">
          <h3>错误消息</h3>
          <pre class="code-block">{{ detailDialog.data.error_message }}</pre>
        </div>

        <div v-if="detailDialog.data.error_stack" class="detail-section">
          <h3>堆栈跟踪</h3>
          <pre class="code-block">{{ detailDialog.data.error_stack }}</pre>
        </div>

        <div v-if="detailDialog.data.request_params" class="detail-section">
          <h3>请求参数</h3>
          <pre class="code-block">{{ formatJSON(detailDialog.data.request_params) }}</pre>
        </div>

        <div v-if="detailDialog.data.additional_data" class="detail-section">
          <h3>附加数据</h3>
          <pre class="code-block">{{ formatJSON(detailDialog.data.additional_data) }}</pre>
        </div>

        <div v-if="detailDialog.data.resolved" class="detail-section">
          <h3>解决信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="解决人">{{ detailDialog.data.resolved_by }}</el-descriptions-item>
            <el-descriptions-item label="解决时间">{{ detailDialog.data.resolved_at }}</el-descriptions-item>
            <el-descriptions-item label="解决备注">{{ detailDialog.data.resolution_note || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialog.visible = false">关闭</el-button>
          <el-button 
            v-if="detailDialog.data && !detailDialog.data.resolved"
            type="success"
            @click="markAsResolved(detailDialog.data)"
          >
            标记已解决
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import request from '@/api/index.js'

// 数据
const loading = ref(false)
const errorLogs = ref([])
const dateRange = ref([])

// 错误监控
const lastErrorId = ref(0)
let pollingTimer = null

const stats = reactive({
  errorCount: 0,
  criticalCount: 0,
  unresolvedCount: 0,
  frontendCount: 0
})

const filters = reactive({
  level: '',
  source: '',
  resolved: null,
  start_date: '',
  end_date: '',
  search: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const detailDialog = reactive({
  visible: false,
  data: null
})

// 方法
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
      resolved: filters.resolved === null ? undefined : filters.resolved
    }

    const data = await request.get('/error-logs', { params })
    
    if (data.success) {
      errorLogs.value = data.data.list
      pagination.total = data.data.total
    }
  } catch (error) {
    ElMessage.error('获取错误日志失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const data = await request.get('/error-logs-stats', {
      params: { timeRange: '24h' }
    })
    
    if (data.success) {
      // 计算统计数据
      const levels = data.data.levels || []
      const sources = data.data.sources || []
      
      stats.errorCount = levels.reduce((sum, item) => sum + parseInt(item.count), 0)
      stats.criticalCount = levels.find(item => item.error_level === 'critical')?.count || 0
      stats.frontendCount = sources.find(item => item.error_source === 'frontend')?.count || 0
      
      // 获取未解决数量
      const logsData = await request.get('/error-logs', {
        params: { resolved: false, pageSize: 1 }
      })
      stats.unresolvedCount = logsData.data?.total || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.start_date = dates[0].toISOString().split('T')[0]
    filters.end_date = dates[1].toISOString().split('T')[0]
  } else {
    filters.start_date = ''
    filters.end_date = ''
  }
  fetchLogs()
}

const handleRowClick = async (row) => {
  try {
    const data = await request.get(`/error-logs/${row.id}`)
    if (data.success) {
      detailDialog.data = data.data
      detailDialog.visible = true
    }
  } catch (error) {
    ElMessage.error('获取错误详情失败')
  }
}

const markAsResolved = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入解决备注（可选）', '标记为已解决', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea'
    })

    const data = await request.put(`/error-logs/${row.id}/resolve`, {
      resolution_note: value
    })

    if (data.success) {
      ElMessage.success('已标记为已解决')
      detailDialog.visible = false
      refreshData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const refreshData = () => {
  fetchLogs()
  fetchStats()
}

const getLevelType = (level) => {
  const types = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger'
  }
  return types[level] || 'info'
}

const getLevelLabel = (level) => {
  const labels = {
    info: 'Info',
    warning: 'Warning',
    error: 'Error',
    critical: 'Critical'
  }
  return labels[level] || level
}

const getSourceType = (source) => {
  const types = {
    frontend: 'primary',
    backend: 'success',
    database: 'warning',
    external_api: 'info',
    cron_job: 'danger'
  }
  return types[source] || 'info'
}

const getSourceLabel = (source) => {
  const labels = {
    frontend: '前端',
    backend: '后端',
    database: '数据库',
    external_api: '外部API',
    cron_job: '定时任务'
  }
  return labels[source] || source
}

const formatJSON = (data) => {
  try {
    if (typeof data === 'string') {
      return JSON.stringify(JSON.parse(data), null, 2)
    }
    return JSON.stringify(data, null, 2)
  } catch {
    return data
  }
}

// 播放提示音
const playErrorSound = () => {
  try {
    // 使用Web Audio API生成提示音
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // 设置音色（三声提示音）
    oscillator.frequency.value = 800
    gainNode.gain.value = 0.3
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
    
    // 第二声
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 800
      gain2.gain.value = 0.3
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.1)
    }, 150)
    
    // 第三声
    setTimeout(() => {
      const osc3 = audioContext.createOscillator()
      const gain3 = audioContext.createGain()
      osc3.connect(gain3)
      gain3.connect(audioContext.destination)
      osc3.frequency.value = 1000
      gain3.gain.value = 0.3
      osc3.start(audioContext.currentTime)
      osc3.stop(audioContext.currentTime + 0.15)
    }, 300)
  } catch (error) {
    console.error('播放提示音失败:', error)
  }
}

// 检查新错误
const checkNewErrors = async () => {
  try {
    const data = await request.get('/error-logs', {
      params: {
        page: 1,
        pageSize: 1,
        resolved: false
      }
    })
    
    if (data.success && data.data.list.length > 0) {
      const latestError = data.data.list[0]
      
      // 如果有新错误
      if (latestError.id > lastErrorId.value) {
        console.log('[ErrorLogs] 🔔 检测到新错误!', latestError)
        
        // 更新最后id
        lastErrorId.value = latestError.id
        
        // 播放提示音
        playErrorSound()
        
        // 显示通知
        const errorTypeText = latestError.error_level === 'critical' ? '🔥 严重错误' : '❌ 新错误'
        ElNotification({
          title: errorTypeText,
          message: `${latestError.error_type}: ${latestError.error_message.substring(0, 50)}...`,
          type: latestError.error_level === 'critical' ? 'error' : 'warning',
          duration: 8000,
          onClick: () => {
            handleRowClick(latestError)
          }
        })
        
        // 刷新数据
        refreshData()
      }
    }
  } catch (error) {
    console.error('检查新错误失败:', error)
  }
}

// 初始化最后id
const initLastErrorId = async () => {
  try {
    const data = await request.get('/error-logs', {
      params: {
        page: 1,
        pageSize: 1,
        resolved: false
      }
    })
    
    if (data.success && data.data.list.length > 0) {
      lastErrorId.value = data.data.list[0].id
      console.log('[ErrorLogs] 初始化最后错误 ID:', lastErrorId.value)
    }
  } catch (error) {
    console.error('初始化最后id失败:', error)
  }
}

// 启动轮询
const startPolling = () => {
  console.log('[ErrorLogs] 启动错误监控轮询...')
  
  // 立即执行一次检查
  setTimeout(() => {
    checkNewErrors()
  }, 3000)
  
  // 每15秒检查一次
  pollingTimer = setInterval(() => {
    checkNewErrors()
  }, 15000)
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
    console.log('[ErrorLogs] 停止错误监控轮询')
  }
}

onMounted(() => {
  refreshData()
  // 初始化最后id并启动轮询
  initLastErrorId().then(() => {
    startPolling()
  })
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.error-logs-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: var(--admin-text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--admin-text-secondary);
  margin-top: 5px;
}

.filter-card, .table-card {
  margin-bottom: 20px;
}

.error-message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.error-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h3 {
  margin-bottom: 10px;
  color: var(--admin-text-primary);
}

.code-block {
  background: var(--admin-bg-color);
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--admin-text-primary);
}
</style>

<style>
/* 错误详情对话框向右偏移 */
.el-dialog__wrapper .el-dialog {
  margin-left: 35px !important;
}
</style>
