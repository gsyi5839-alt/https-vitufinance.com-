<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <p class="description">管理平台所有用户信息和余额</p>
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
      :data="userList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="200">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyAddress(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="usdt_balance" label="USDT余额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.usdt_balance) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="wld_balance" label="WLD余额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.wld_balance) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="total_deposit" label="总充值" width="140" align="right">
        <template #default="{ row }">
          <span class="amount positive">{{ formatAmount(row.total_deposit) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="total_withdraw" label="总提款" width="140" align="right">
        <template #default="{ row }">
          <span class="amount negative">{{ formatAmount(row.total_withdraw) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="注册时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">
            编辑余额
          </el-button>
          <el-button type="primary" link size="small" @click="handleViewDetail(row)">
            详情
          </el-button>
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
    
    <!-- 编辑余额弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户余额"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="钱包地址">
          <el-input v-model="editForm.wallet_address" disabled />
        </el-form-item>
        <el-form-item label="USDT余额" prop="usdt_balance">
          <el-input-number
            v-model="editForm.usdt_balance"
            :precision="4"
            :step="1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="WLD余额" prop="wld_balance">
          <el-input-number
            v-model="editForm.wld_balance"
            :precision="4"
            :step="1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作备注" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入操作备注（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitEdit">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 用户详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="用户详情"
      size="500px"
    >
      <template v-if="currentUser">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="钱包地址">
            {{ currentUser.wallet_address }}
          </el-descriptions-item>
          <el-descriptions-item label="USDT余额">
            {{ formatAmount(currentUser.usdt_balance) }}
          </el-descriptions-item>
          <el-descriptions-item label="WLD余额">
            {{ formatAmount(currentUser.wld_balance) }}
          </el-descriptions-item>
          <el-descriptions-item label="总充值">
            {{ formatAmount(currentUser.total_deposit) }}
          </el-descriptions-item>
          <el-descriptions-item label="总提款">
            {{ formatAmount(currentUser.total_withdraw) }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatTime(currentUser.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatTime(currentUser.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 用户管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, CopyDocument } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getUsers, updateUserBalance } from '@/api'

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 用户列表
const userList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 编辑相关
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  wallet_address: '',
  usdt_balance: 0,
  wld_balance: 0,
  remark: ''
})

const editRules = {
  usdt_balance: [{ required: true, message: '请输入USDT余额', trigger: 'blur' }],
  wld_balance: [{ required: true, message: '请输入WLD余额', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入操作备注', trigger: 'blur' }]
}

// 详情相关
const detailDrawerVisible = ref(false)
const currentUser = ref(null)

/**
 * 获取用户列表
 */
const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      wallet_address: searchForm.wallet_address || undefined
    })
    
    if (res.success) {
      userList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  pagination.page = 1
  fetchUsers()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchUsers()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchUsers()
}

/**
 * 编辑用户
 */
const handleEdit = (row) => {
  editForm.wallet_address = row.wallet_address
  editForm.usdt_balance = parseFloat(row.usdt_balance)
  editForm.wld_balance = parseFloat(row.wld_balance)
  editForm.remark = ''
  editDialogVisible.value = true
}

/**
 * 提交编辑
 */
const handleSubmitEdit = async () => {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    const res = await updateUserBalance(editForm.wallet_address, {
      usdt_balance: editForm.usdt_balance,
      wld_balance: editForm.wld_balance,
      remark: editForm.remark
    })
    
    if (res.success) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      fetchUsers()
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (error) {
    console.error('更新用户余额失败:', error)
  } finally {
    submitting.value = false
  }
}

/**
 * 查看详情
 */
const handleViewDetail = (row) => {
  currentUser.value = row
  detailDrawerVisible.value = true
}

/**
 * 复制地址
 */
const copyAddress = (address) => {
  navigator.clipboard.writeText(address)
  ElMessage.success('地址已复制')
}

/**
 * 缩短地址
 */
const shortenAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 10)}...${address.slice(-8)}`
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

// 初始化
onMounted(() => {
  fetchUsers()
})
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    color: #409EFF;
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.amount {
  font-weight: 600;
  
  &.positive {
    color: #67C23A;
  }
  
  &.negative {
    color: #F56C6C;
  }
}
</style>

