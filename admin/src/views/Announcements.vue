<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>公告管理</h2>
      <p class="description">管理平台公告，支持创建、编辑和删除公告</p>
    </div>
    
    <!-- 操作栏 -->
    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增公告
      </el-button>
    </div>
    
    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="announcementList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="title" label="公告标题" min-width="300">
        <template #default="{ row }">
          <el-tooltip :content="row.title" placement="top" :disabled="row.title.length < 50">
            <span class="title-text">{{ row.title }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="sort_order" label="排序" width="80" align="center" />
      
      <el-table-column prop="created_at" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="updated_at" label="更新时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.updated_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            :type="row.status === 'active' ? 'warning' : 'success'"
            link
            size="small"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">
            删除
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
    
    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '新增公告'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入公告标题"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容（可选）"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number
            v-model="form.sort_order"
            :min="0"
            :max="9999"
            placeholder="数字越大越靠前"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 公告管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api'

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 公告列表
const announcementList = ref([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 弹窗相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  title: '',
  content: '',
  sort_order: 0,
  status: 'active'
})

const formRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { max: 500, message: '标题不能超过500个字符', trigger: 'blur' }
  ]
}

/**
 * 获取公告列表
 */
const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const res = await getAnnouncements({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    if (res.success) {
      announcementList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取公告列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchAnnouncements()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchAnnouncements()
}

/**
 * 新增公告
 */
const handleAdd = () => {
  isEdit.value = false
  form.id = null
  form.title = ''
  form.content = ''
  form.sort_order = 0
  form.status = 'active'
  dialogVisible.value = true
}

/**
 * 编辑公告
 */
const handleEdit = (row) => {
  isEdit.value = true
  form.id = row.id
  form.title = row.title
  form.content = row.content || ''
  form.sort_order = row.sort_order || 0
  form.status = row.status
  dialogVisible.value = true
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    let res
    if (isEdit.value) {
      res = await updateAnnouncement(form.id, {
        title: form.title,
        content: form.content,
        sort_order: form.sort_order,
        status: form.status
      })
    } else {
      res = await createAnnouncement({
        title: form.title,
        content: form.content,
        sort_order: form.sort_order,
        status: form.status
      })
    }
    
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchAnnouncements()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

/**
 * 切换状态
 */
const handleToggleStatus = async (row) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确定${action}此公告吗？`, '确认操作', { type: 'warning' })
    
    const res = await updateAnnouncement(row.id, { status: newStatus })
    if (res.success) {
      ElMessage.success(`已${action}`)
      fetchAnnouncements()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 删除公告
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除此公告吗？此操作不可恢复', '确认删除', { type: 'warning' })
    
    const res = await deleteAnnouncement(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchAnnouncements()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 初始化
onMounted(() => {
  fetchAnnouncements()
})
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.title-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

