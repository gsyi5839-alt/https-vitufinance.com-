<template>
  <div class="documents-container">
    <!-- Header section -->
    <div class="page-header">
      <h1>资质文件管理</h1>
      <p class="subtitle">管理平台的白皮书、MSB许可证和营业执照等资质文件</p>
    </div>

    <!-- Documents grid -->
    <div class="documents-grid">
      <!-- White Paper Card -->
      <el-card class="doc-card">
        <template #header>
          <div class="card-header">
            <span class="title">
              <el-icon><Document /></el-icon>
              白皮书
            </span>
            <el-tag :type="getWhitepaperTagType()" size="small">
              {{ getWhitepaperTagText() }}
            </el-tag>
          </div>
        </template>
        
        <div class="doc-content">
          <div class="preview-area" @click="previewDocument('whitepaper')">
            <template v-if="docConfig.whitepaper_type === 'pdf'">
              <el-icon class="preview-icon"><Document /></el-icon>
              <span class="preview-text">PDF 文档</span>
            </template>
            <template v-else-if="docConfig.whitepaper_type === 'gallery'">
              <!-- Gallery type: show first page as preview -->
              <img :src="getWhitepaperPreviewUrl()" alt="White Paper" class="preview-image" />
              <span class="gallery-badge">{{ docConfig.whitepaper_pages || 26 }} 页</span>
            </template>
            <img v-else :src="docConfig.whitepaper_url" alt="White Paper" class="preview-image" />
          </div>
          
          <div class="doc-info">
            <p><strong>当前文件：</strong></p>
            <el-tooltip :content="docConfig.whitepaper_url" placement="top">
              <span class="url-text">{{ docConfig.whitepaper_url }}</span>
            </el-tooltip>
          </div>
          
          <el-upload
            class="upload-area"
            :action="uploadUrl('whitepaper')"
            :headers="uploadHeaders"
            :on-success="(res) => handleUploadSuccess(res, 'whitepaper')"
            :on-error="handleUploadError"
            :before-upload="(file) => beforeUpload(file, 'pdf')"
            accept=".pdf"
            :show-file-list="false"
          >
            <el-button type="primary" :icon="Upload">上传新白皮书</el-button>
            <template #tip>
              <div class="upload-tip">支持 PDF 格式，最大 30MB</div>
            </template>
          </el-upload>
        </div>
      </el-card>

      <!-- MSB License Card -->
      <el-card class="doc-card">
        <template #header>
          <div class="card-header">
            <span class="title">
              <el-icon><Medal /></el-icon>
              MSB 许可证
            </span>
            <el-tag :type="docConfig.msb_type === 'pdf' ? 'primary' : 'success'" size="small">
              {{ docConfig.msb_type === 'pdf' ? 'PDF' : 'Image' }}
            </el-tag>
          </div>
        </template>
        
        <div class="doc-content">
          <div class="preview-area" @click="previewDocument('msb')">
            <template v-if="docConfig.msb_type === 'pdf'">
              <el-icon class="preview-icon"><Document /></el-icon>
              <span class="preview-text">PDF 文档</span>
            </template>
            <img v-else :src="docConfig.msb_url" alt="MSB License" class="preview-image" />
          </div>
          
          <div class="doc-info">
            <p><strong>当前文件：</strong></p>
            <el-tooltip :content="docConfig.msb_url" placement="top">
              <span class="url-text">{{ docConfig.msb_url }}</span>
            </el-tooltip>
          </div>
          
          <el-upload
            class="upload-area"
            :action="uploadUrl('msb')"
            :headers="uploadHeaders"
            :on-success="(res) => handleUploadSuccess(res, 'msb')"
            :on-error="handleUploadError"
            :before-upload="(file) => beforeUpload(file, 'document')"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            :show-file-list="false"
          >
            <el-button type="primary" :icon="Upload">上传新许可证</el-button>
            <template #tip>
              <div class="upload-tip">支持 PDF 和图片格式，最大 30MB</div>
            </template>
          </el-upload>
        </div>
      </el-card>

      <!-- Business License Card -->
      <el-card class="doc-card">
        <template #header>
          <div class="card-header">
            <span class="title">
              <el-icon><OfficeBuilding /></el-icon>
              营业执照
            </span>
            <el-tag :type="docConfig.business_license_type === 'pdf' ? 'primary' : 'success'" size="small">
              {{ docConfig.business_license_type === 'pdf' ? 'PDF' : 'Image' }}
            </el-tag>
          </div>
        </template>
        
        <div class="doc-content">
          <div class="preview-area" @click="previewDocument('license')">
            <template v-if="docConfig.business_license_type === 'pdf'">
              <el-icon class="preview-icon"><Document /></el-icon>
              <span class="preview-text">PDF 文档</span>
            </template>
            <img v-else :src="docConfig.business_license_url" alt="Business License" class="preview-image" />
          </div>
          
          <div class="doc-info">
            <p><strong>当前文件：</strong></p>
            <el-tooltip :content="docConfig.business_license_url" placement="top">
              <span class="url-text">{{ docConfig.business_license_url }}</span>
            </el-tooltip>
          </div>
          
          <el-upload
            class="upload-area"
            :action="uploadUrl('business-license')"
            :headers="uploadHeaders"
            :on-success="(res) => handleUploadSuccess(res, 'license')"
            :on-error="handleUploadError"
            :before-upload="(file) => beforeUpload(file, 'document')"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            :show-file-list="false"
          >
            <el-button type="primary" :icon="Upload">上传新执照</el-button>
            <template #tip>
              <div class="upload-tip">支持 PDF 和图片格式，最大 30MB</div>
            </template>
          </el-upload>
        </div>
      </el-card>
    </div>

    <!-- Document Preview Dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="80%"
      class="preview-dialog"
      destroy-on-close
    >
      <div class="preview-container">
        <template v-if="previewType === 'pdf'">
          <iframe :src="previewUrl" class="pdf-frame" />
        </template>
        <template v-else>
          <img :src="previewUrl" alt="Document Preview" class="preview-full-image" />
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Medal, OfficeBuilding, Upload } from '@element-plus/icons-vue'
import { getDocuments } from '@/api'

// Document configuration state
const docConfig = reactive({
  whitepaper_url: '/static/documents/whitepaper.pdf',
  whitepaper_type: 'pdf',
  whitepaper_pages: 26,  // Number of pages for gallery type
  msb_url: '/static/documents/MSB.png',
  msb_type: 'image',
  business_license_url: '/static/documents/license.png',
  business_license_type: 'image'
})

// Helper functions for whitepaper display
const getWhitepaperTagType = () => {
  if (docConfig.whitepaper_type === 'pdf') return 'primary'
  if (docConfig.whitepaper_type === 'gallery') return 'warning'
  return 'success'
}

const getWhitepaperTagText = () => {
  if (docConfig.whitepaper_type === 'pdf') return 'PDF'
  if (docConfig.whitepaper_type === 'gallery') return 'Gallery'
  return 'Image'
}

// Get preview URL for whitepaper (handles gallery type)
const getWhitepaperPreviewUrl = () => {
  if (docConfig.whitepaper_type === 'gallery') {
    // For gallery type, return the first page image
    return `${docConfig.whitepaper_url}/page-01.png`
  }
  return docConfig.whitepaper_url
}

// Preview dialog state
const previewVisible = ref(false)
const previewTitle = ref('')
const previewUrl = ref('')
const previewType = ref('image')

// Upload headers with auth token
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`
}))

// Generate upload URL for each document type
const uploadUrl = (docType) => {
  return `/api/admin/documents/${docType}`
}

// Load current document configuration from server
const loadDocuments = async () => {
  try {
    const res = await getDocuments()
    if (res.success && res.data) {
      Object.assign(docConfig, res.data)
    }
  } catch (error) {
    console.error('Failed to load documents:', error)
    ElMessage.error('加载资质文件配置失败')
  }
}

// Validate file before upload
const beforeUpload = (file, type) => {
  const maxSize = 30 * 1024 * 1024 // 30MB
  
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 30MB')
    return false
  }

  if (type === 'pdf') {
    if (file.type !== 'application/pdf') {
      ElMessage.error('只支持 PDF 格式')
      return false
    }
  } else if (type === 'document') {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      ElMessage.error('只支持 PDF 和图片格式')
      return false
    }
  }

  return true
}

// Handle successful upload
const handleUploadSuccess = (response, docType) => {
  if (response.success) {
    ElMessage.success(response.message || '上传成功')
    // Reload document configuration
    loadDocuments()
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

// Handle upload error
const handleUploadError = (error) => {
  console.error('Upload error:', error)
  ElMessage.error('上传失败，请重试')
}

// Preview document in dialog
const previewDocument = (docType) => {
  let url = ''
  let title = ''
  let type = 'image'

  switch (docType) {
    case 'whitepaper':
      url = docConfig.whitepaper_url
      title = '白皮书预览'
      type = docConfig.whitepaper_type
      break
    case 'msb':
      url = docConfig.msb_url
      title = 'MSB 许可证预览'
      type = docConfig.msb_type
      break
    case 'license':
      url = docConfig.business_license_url
      title = '营业执照预览'
      type = docConfig.business_license_type
      break
  }

  previewUrl.value = url
  previewTitle.value = title
  previewType.value = type
  previewVisible.value = true
}

// Initialize
onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.documents-container {
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
}

.page-header .subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 14px;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.doc-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.doc-card :deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 20px;
}

.doc-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

.card-header .title .el-icon {
  font-size: 20px;
  color: #409eff;
}

.doc-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-area {
  height: 200px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px dashed rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.preview-area:hover {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.preview-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
}

.preview-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Gallery badge for multi-page documents */
.preview-area {
  position: relative;
}

.gallery-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(230, 162, 60, 0.9);
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.doc-info {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 6px;
}

.doc-info p {
  margin: 0 0 4px 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.url-text {
  color: #409eff;
  font-size: 12px;
  word-break: break-all;
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin-top: 4px;
}

/* Preview Dialog Styles */
.preview-dialog :deep(.el-dialog) {
  background: #1a1a2e;
  border-radius: 12px;
}

.preview-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-dialog :deep(.el-dialog__title) {
  color: #fff;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.pdf-frame {
  width: 100%;
  height: 70vh;
  border: none;
  background: #fff;
}

.preview-full-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .documents-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-area {
    height: 150px;
  }
}
</style>
