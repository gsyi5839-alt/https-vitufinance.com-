<template>
  <div class="page-container">
    <div class="page-header">
      <h2>邮件群发</h2>
      <p class="description">给已绑定邮箱的前端用户发送邮件通知</p>
    </div>

    <el-alert
      v-if="emailStatus && !emailStatus.configured"
      type="warning"
      show-icon
      :closable="false"
      title="Gmail SMTP 尚未配置"
      description="请先在后端 .env 配置 SMTP_USER、SMTP_PASS、SMTP_FROM_EMAIL，配置后重启后端服务。"
      class="status-alert"
    />

    <div class="search-area">
      <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="钱包地址或邮箱"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="仅看已绑定">
          <el-switch v-model="searchForm.bound_only" />
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
          <el-button @click="handleVerifySmtp">
            <el-icon><Check /></el-icon>
            验证SMTP
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-toolbar">
      <div class="selection-summary">
        已选 {{ selectedEmailUsers.length }} 名可发送用户
      </div>
      <el-button
        type="primary"
        :disabled="selectedEmailUsers.length === 0"
        @click="openSendDialog"
      >
        <el-icon><Message /></el-icon>
        给选中用户发邮件
      </el-button>
    </div>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="userList"
      row-key="wallet_address"
      stripe
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" :selectable="canSelectUser" />
      <el-table-column prop="wallet_address" label="钱包地址" min-width="210">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyText(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="230">
        <template #default="{ row }">
          <el-tag v-if="row.email" type="success" effect="plain">{{ row.email }}</el-tag>
          <el-tag v-else type="info" effect="plain">未绑定</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="email_bound_at" label="绑定时间" width="170">
        <template #default="{ row }">
          {{ row.email_bound_at ? formatTime(row.email_bound_at) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="total_deposit" label="总充值" width="120" align="right">
        <template #default="{ row }">{{ formatAmount(row.total_deposit) }}</template>
      </el-table-column>
      <el-table-column prop="is_banned" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="Number(row.is_banned) === 1 ? 'danger' : 'success'" size="small">
            {{ Number(row.is_banned) === 1 ? '冻结' : '正常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="fetchUsers"
      />
    </div>

    <el-dialog
      v-model="sendDialogVisible"
      title="发送邮件"
      width="640px"
      destroy-on-close
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="`将发送给 ${selectedEmailUsers.length} 名已绑定邮箱用户`"
        class="dialog-alert"
      />
      <el-form ref="sendFormRef" :model="sendForm" :rules="sendRules" label-width="90px">
        <el-form-item label="邮件标题" prop="subject">
          <el-input v-model="sendForm.subject" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="邮件内容" prop="content">
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="9"
            maxlength="5000"
            show-word-limit
            placeholder="请输入要发送给用户的邮件内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sendDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="handleSendEmail">
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, CopyDocument, Message, Refresh, Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getEmailConfigStatus,
  getEmailUsers,
  sendBulkEmail,
  verifyEmailConfig
} from '@/api'

const loading = ref(false)
const sending = ref(false)
const tableRef = ref(null)
const sendFormRef = ref(null)
const emailStatus = ref(null)
const userList = ref([])
const selectedRows = ref([])
const sendDialogVisible = ref(false)

const searchForm = reactive({
  keyword: '',
  bound_only: true
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const sendForm = reactive({
  subject: '',
  content: ''
})

const sendRules = {
  subject: [
    { required: true, message: '请输入邮件标题', trigger: 'blur' },
    { min: 2, max: 120, message: '标题长度为 2-120 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入邮件内容', trigger: 'blur' },
    { min: 2, max: 5000, message: '内容长度为 2-5000 个字符', trigger: 'blur' }
  ]
}

const selectedEmailUsers = computed(() => {
  return selectedRows.value.filter((row) => canSelectUser(row))
})

const fetchStatus = async () => {
  const res = await getEmailConfigStatus()
  if (res.success) {
    emailStatus.value = res.data
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getEmailUsers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      bound_only: searchForm.bound_only
    })
    if (res.success) {
      userList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.bound_only = true
  pagination.page = 1
  tableRef.value?.clearSelection()
  fetchUsers()
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchUsers()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const canSelectUser = (row) => {
  return Boolean(row?.email && String(row.email).includes('@'))
}

const openSendDialog = () => {
  if (selectedEmailUsers.value.length === 0) {
    ElMessage.warning('请先选择已绑定邮箱的用户')
    return
  }
  sendDialogVisible.value = true
}

const handleVerifySmtp = async () => {
  const res = await verifyEmailConfig()
  if (res.success) {
    ElMessage.success(res.message || 'SMTP 配置验证通过')
    fetchStatus()
  } else {
    ElMessage.error(res.message || 'SMTP 配置验证失败')
  }
}

const handleSendEmail = async () => {
  const valid = await sendFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await ElMessageBox.confirm(
      `确定向 ${selectedEmailUsers.value.length} 名用户发送邮件吗？`,
      '确认发送',
      { type: 'warning', confirmButtonText: '发送', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  sending.value = true
  try {
    const res = await sendBulkEmail({
      wallet_addresses: selectedEmailUsers.value.map((row) => row.wallet_address),
      subject: sendForm.subject,
      content: sendForm.content
    })
    const data = res.data || {}
    if (res.success) {
      ElMessage.success(res.message || '发送成功')
      sendDialogVisible.value = false
      sendForm.subject = ''
      sendForm.content = ''
      tableRef.value?.clearSelection()
    } else if (data.recipient_count) {
      ElMessage.warning(res.message || '发送完成，但存在失败用户')
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } finally {
    sending.value = false
  }
}

const copyText = async (text) => {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

const shortenAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(4)
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
}

onMounted(() => {
  fetchStatus()
  fetchUsers()
})
</script>

<style lang="scss" scoped>
.status-alert,
.dialog-alert {
  margin-bottom: 16px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selection-summary {
  color: #606266;
  font-size: 14px;
}

.wallet-address {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 13px;

  &:hover {
    color: #409eff;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
