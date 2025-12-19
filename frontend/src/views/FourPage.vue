<template>
  <div class="four-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">{{ t('fourPage.pageTitle') }}</h1>
      <p class="page-desc">{{ t('fourPage.pageDesc') }}</p>
    </div>

    <!-- 服务网格 -->
    <div class="services-grid">
      <div v-for="(service, index) in t('fourPage.services')" :key="index" class="service-card">
        <div class="icon-wrapper">
          <img :src="`${ICON_PATHS.SERVICE}${iconNames[index]}`" :alt="service.title" class="service-icon" />
        </div>
        <h3 class="service-title">{{ service.title }}</h3>
        <p class="service-desc">{{ service.description }}</p>
        <div class="service-features">
          <div v-for="(feature, fIndex) in service.features" :key="fIndex" class="feature-tag">
            {{ feature }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部CTA -->
    <div class="cta-section">
      <h2>{{ t('fourPage.ctaTitle') }}</h2>
      <p>{{ t('fourPage.ctaDesc') }}</p>
      <button class="cta-btn">{{ t('fourPage.ctaButton') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ICON_PATHS } from '@/utils/constants'

const { t } = useI18n()

const iconNames = ref(['icon1.png', 'icon2.png', 'icon3.png', 'icon4.png', 'icon6.png'])
</script>

<style scoped>
.four-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9ff 0%, #fff 100%);
  padding: 60px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  font-size: 42px;
  font-weight: bold;
  color: #1a1a2e;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-desc {
  font-size: 18px;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
}

.services-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 80px;
}

.service-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.service-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(103, 126, 234, 0.2);
  border-color: #667eea;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 16px;
}

.service-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.service-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  text-align: center;
}

.service-desc {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
  text-align: center;
}

.service-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.feature-tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.cta-section {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  max-width: 800px;
  margin: 0 auto;
  color: #fff;
}

.cta-section h2 {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 16px;
}

.cta-section p {
  font-size: 18px;
  margin-bottom: 32px;
  opacity: 0.95;
}

.cta-btn {
  background: #fff;
  color: #667eea;
  border: none;
  padding: 16px 48px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 32px;
  }

  .services-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .service-card {
    padding: 24px;
  }

  .cta-section h2 {
    font-size: 28px;
  }

  .cta-section p {
    font-size: 16px;
  }
}
</style>
