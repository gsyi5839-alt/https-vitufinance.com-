<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon><Document /></el-icon>
        系统日志
      </h2>
      <p class="description">查看系统操作日志和安全事件</p>
    </div>
    
    <!-- 快捷筛选标签 -->
    <div class="quick-filters">
      <el-tag
        v-for="filter in quickFilters"
        :key="filter.value"
        :type="activeFilter === filter.value ? 'primary' : 'info'"
        :effect="activeFilter === filter.value ? 'dark' : 'plain'"
        class="filter-tag"
        @click="setQuickFilter(filter.value)"
      >
        {{ filter.label }}
        <span v-if="filter.count" class="filter-count">{{ filter.count }}</span>
      </el-tag>
    </div>
    
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
        <el-form-item label="日志级别">
          <el-select v-model="searchForm.level" placeholder="全部" clearable style="width: 120px">
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
            <el-option label="安全" value="security" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.action" placeholder="全部" clearable style="width: 140px">
            <el-option label="登录" value="login" />
            <el-option label="登出" value="logout" />
            <el-option label="充值" value="deposit" />
            <el-option label="提款" value="withdraw" />
            <el-option label="余额变更" value="balance_change" />
            <el-option label="系统设置" value="settings" />
            <el-option label="API请求" value="api" />
          </el-select>
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input
            v-model="searchForm.ip"
            placeholder="请输入IP地址"
            clearable
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
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
      :data="logList"
      stripe
      border
      style="width: 100%"
      :row-class-name="getRowClassName"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="log-detail">
            <div class="detail-item">
              <span class="detail-label">完整消息：</span>
              <span class="detail-value">{{ row.message }}</span>
            </div>
            <div class="detail-item" v-if="row.user_agent">
              <span class="detail-label">User-Agent：</span>
              <span class="detail-value">{{ row.user_agent }}</span>
            </div>
            <div class="detail-item" v-if="row.request_data">
              <span class="detail-label">请求数据：</span>
              <pre class="detail-code">{{ JSON.stringify(row.request_data, null, 2) }}</pre>
            </div>
            <div class="detail-item" v-if="row.response_data">
              <span class="detail-label">响应数据：</span>
              <pre class="detail-code">{{ JSON.stringify(row.response_data, null, 2) }}</pre>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="时间" width="170">
        <template #default="{ row }">
          <span class="log-time">{{ formatTime(row.created_at) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="level" label="级别" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.level)" size="small" effect="dark">
            {{ getLevelText(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="action" label="操作类型" width="120">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ getActionText(row.action) }}</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="user" label="操作者" width="120">
        <template #default="{ row }">
          <span class="log-user">{{ row.user || '-' }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="ip" label="IP地址" width="140">
        <template #default="{ row }">
          <span class="log-ip" @click="copyText(row.ip)">
            {{ row.ip }}
            <el-icon><CopyDocument /></el-icon>
          </span>
        </template>
      </el-table-column>
      
      <el-table-column prop="message" label="日志内容" min-width="300">
        <template #default="{ row }">
          <el-tooltip v-if="row.message && row.message.length > 60" :content="row.message" placement="top">
            <span class="log-message">{{ row.message.slice(0, 60) }}...</span>
          </el-tooltip>
          <span v-else class="log-message">{{ row.message }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.status === 'success'" color="#67C23A"><CircleCheckFilled /></el-icon>
          <el-icon v-else-if="row.status === 'failed'" color="#F56C6C"><CircleCloseFilled /></el-icon>
          <el-icon v-else color="#E6A23C"><WarningFilled /></el-icon>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[20, 50, 100, 200]"
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
 * 系统日志页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Document, Search, Refresh, CopyDocument, 
  CircleCheckFilled, CircleCloseFilled, WarningFilled 
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import request from '@/api'

// 加载状态
const loading = ref(false)

// 快捷筛选
const quickFilters = ref([
  { label: '全部', value: 'all', count: 0 },
  { label: '今日', value: 'today', count: 0 },
  { label: '错误', value: 'error', count: 0 },
  { label: '安全', value: 'security', count: 0 },
  { label: '登录', value: 'login', count: 0 }
])

const activeFilter = ref('all')

// 日志列表
const logList = ref([])

// 搜索表单
const searchForm = reactive({
  level: '',
  action: '',
  ip: '',
  dateRange: null
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

/**
 * 获取日志列表
 */
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      level: searchForm.level || undefined,
      action: searchForm.action || undefined,
      ip: searchForm.ip || undefined
    }
    
    if (searchForm.dateRange) {
      params.start_time = searchForm.dateRange[0]
      params.end_time = searchForm.dateRange[1]
    }
    
    const res = await request.get('/logs', { params })
    
    if (res.success) {
      logList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取日志列表失败:', error)
    // 使用模拟数据
    logList.value = generateMockData()
    pagination.total = 500
  } finally {
    loading.value = false
  }
}

/**
 * 生成模拟数据
 */
const generateMockData = () => {
  const levels = ['info', 'info', 'info', 'warning', 'error', 'security']
  const actions = ['login', 'logout', 'deposit', 'withdraw', 'balance_change', 'settings', 'api']
  const statuses = ['success', 'success', 'success', 'failed']
  const messages = [
    '用户登录成功',
    '用户登出',
    '处理充值请求',
    '处理提款请求',
    '更新用户余额',
    '修改系统设置',
    'API请求处理',
    '登录失败：密码错误',
    '检测到异常登录尝试',
    '安全警告：多次登录失败'
  ]
  const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '203.156.78.45', '45.32.156.78']
  const users = ['admin', 'admin', 'system', null]
  
  return Array.from({ length: 20 }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)]
    const action = actions[Math.floor(Math.random() * actions.length)]
    
    return {
      id: i + 1,
      level,
      action,
      user: users[Math.floor(Math.random() * users.length)],
      ip: ips[Math.floor(Math.random() * ips.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      request_data: action === 'api' ? { method: 'GET', path: '/api/users' } : null,
      response_data: action === 'api' ? { success: true, count: 10 } : null,
      created_at: dayjs().subtract(Math.floor(Math.random() * 48), 'hour').subtract(Math.floor(Math.random() * 60), 'minute').toISOString()
    }
  })
}

/**
 * 设置快捷筛选
 */
const setQuickFilter = (value) => {
  activeFilter.value = value
  
  // 重置搜索条件
  searchForm.level = ''
  searchForm.action = ''
  searchForm.ip = ''
  searchForm.dateRange = null
  
  // 根据筛选器设置条件
  switch (value) {
    case 'today':
      searchForm.dateRange = [
        dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss')
      ]
      break
    case 'error':
      searchForm.level = 'error'
      break
    case 'security':
      searchForm.level = 'security'
      break
    case 'login':
      searchForm.action = 'login'
      break
  }
  
  handleSearch()
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchLogs()
}

/**
 * 重置
 */
const handleReset = () => {
  activeFilter.value = 'all'
  searchForm.level = ''
  searchForm.action = ''
  searchForm.ip = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchLogs()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchLogs()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchLogs()
}

/**
 * 复制文本
 */
const copyText = (text) => {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取级别类型
 */
const getLevelType = (level) => {
  const types = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    security: ''
  }
  return types[level] || 'info'
}

/**
 * 获取级别文本
 */
const getLevelText = (level) => {
  const texts = {
    info: '信息',
    warning: '警告',
    error: '错误',
    security: '安全'
  }
  return texts[level] || level
}

/**
 * 获取操作类型文本
 */
const getActionText = (action) => {
  const texts = {
    login: '登录',
    logout: '登出',
    deposit: '充值',
    withdraw: '提款',
    balance_change: '余额变更',
    settings: '系统设置',
    api: 'API请求'
  }
  return texts[action] || action
}

/**
 * 获取行类名
 */
const getRowClassName = ({ row }) => {
  if (row.level === 'error') return 'error-row'
  if (row.level === 'warning') return 'warning-row'
  if (row.level === 'security') return 'security-row'
  return ''
}

// 初始化
onMounted(() => {
  fetchLogs()
})
</script>

<style lang="scss" scoped>
.quick-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  
  .filter-tag {
    cursor: pointer;
    transition: all 0.2s;
    padding: 8px 16px;
    
    &:hover {
      transform: translateY(-2px);
    }
    
    .filter-count {
      margin-left: 6px;
      padding: 0 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      font-size: 11px;
    }
  }
}

.log-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--admin-text-secondary);
}

.log-user {
  font-weight: 500;
  color: var(--admin-text-primary);
}

.log-ip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--admin-text-regular);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    color: var(--admin-primary);
  }
  
  .el-icon {
    font-size: 12px;
    opacity: 0.6;
  }
}

.log-message {
  font-size: 13px;
  color: var(--admin-text-regular);
  line-height: 1.5;
}

.log-detail {
  padding: 16px 24px;
  background: var(--admin-bg-color);
  border-radius: 8px;
  
  .detail-item {
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .detail-label {
    font-weight: 500;
    color: var(--admin-text-primary);
    margin-right: 8px;
  }
  
  .detail-value {
    color: var(--admin-text-regular);
    word-break: break-all;
  }
  
  .detail-code {
    margin-top: 8px;
    padding: 12px;
    background: var(--admin-card-bg);
    border: 1px solid var(--admin-border-color);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--admin-text-regular);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

// 行颜色
:deep(.el-table) {
  .error-row {
    --el-table-tr-bg-color: rgba(245, 108, 108, 0.05);
  }
  
  .warning-row {
    --el-table-tr-bg-color: rgba(230, 162, 60, 0.05);
  }
  
  .security-row {
    --el-table-tr-bg-color: rgba(64, 158, 255, 0.05);
  }
}
</style>

