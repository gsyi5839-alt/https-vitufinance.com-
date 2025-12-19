<template>
  <!-- 信息卡片网格容器 -->
  <div class="cards-grid-container">
    <!-- White Paper -->
    <div class="info-card" @click="openDocument('whitepaper')">
      <img src="/static/QIANBAO/1.png" alt="White Paper" class="card-image" />
      <span class="card-title">{{ t('assetsPage.whitePaper') }}</span>
    </div>

    <!-- MSB License -->
    <div class="info-card" @click="openDocument('msb')">
      <img src="/static/QIANBAO/2.png" alt="MSB License" class="card-image" />
      <span class="card-title">{{ t('assetsPage.msbLicense') }}</span>
    </div>

    <!-- Safe -->
    <div class="info-card" @click="$emit('open-safe')">
      <img src="/static/QIANBAO/3.png" alt="Safe" class="card-image" />
      <span class="card-title">{{ t('assetsPage.safe') }}</span>
    </div>

    <!-- Business License -->
    <div class="info-card" @click="openDocument('license')">
      <img src="/static/QIANBAO/4.png" alt="Business License" class="card-image" />
      <span class="card-title">{{ t('assetsPage.businessLicense') }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 资产信息卡片网格组件
 * 显示白皮书、MSB许可证、保险箱、营业执照等入口
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Emits
const emit = defineEmits(['open-document', 'open-safe'])

/**
 * 文档配置
 */
const documentConfig = {
  whitepaper: {
    title: 'White Paper',
    type: 'gallery',
    url: '/static/whitepaper/' // 多页文档目录
  },
  msb: {
    title: 'MSB License',
    type: 'pdf',
    url: '/static/documents/msb-license.pdf'
  },
  license: {
    title: 'Business License',
    type: 'image',
    url: '/static/documents/business-license.png'
  }
}

/**
 * 打开文档
 */
const openDocument = (docKey) => {
  const config = documentConfig[docKey]
  if (config) {
    emit('open-document', config)
  }
}
</script>

<style scoped>
/* 卡片网格容器 */
.cards-grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 0 16px;
  margin-bottom: 24px;
  max-width: 387px;
  margin-left: auto;
  margin-right: auto;
}

/* 信息卡片 */
.info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.info-card:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.info-card:active {
  transform: translateY(-2px);
}

.card-image {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .cards-grid-container {
    max-width: 343px;
    gap: 12px;
  }
  
  .info-card {
    padding: 20px 12px;
    gap: 8px;
  }
  
  .card-image {
    width: 56px;
    height: 56px;
  }
  
  .card-title {
    font-size: 13px;
  }
}
</style>

