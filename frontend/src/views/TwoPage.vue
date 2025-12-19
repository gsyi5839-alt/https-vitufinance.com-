<template>
  <div class="two-page">
    <!-- 头部背景 -->
    <div class="header-section" :style="{ backgroundImage: `url(/static/two/headbgimg.png)` }">
      <div class="header-content">
        <h1 class="main-title">{{ t('twoPage.mainTitle') }}</h1>
        <p class="subtitle">{{ t('twoPage.subtitle') }}</p>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="main-content">
      <div class="content-card">
        <img src="/static/two/twobj11.png" alt="Feature" class="feature-img" />
        <div class="card-text">
          <h2>{{ t('twoPage.cardTitle') }}</h2>
          <p>{{ t('twoPage.cardDesc') }}</p>
          <ul class="feature-list">
            <li v-for="(feature, index) in t('twoPage.features')" :key="index">✓ {{ feature }}</li>
          </ul>
          <button class="cta-button">{{ t('twoPage.ctaButton') }}</button>
        </div>
      </div>
    </div>

    <!-- 数据展示区 -->
    <div class="stats-section">
      <div v-for="(stat, index) in t('twoPage.stats')" :key="index" class="stat-item">
        <div class="stat-number">{{ stat.number }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

onMounted(() => {
  // 加载bus.js脚本（如果需要）
  const script = document.createElement('script')
  script.src = '/static/two/bus.js'
  script.async = true
  document.body.appendChild(script)
})
</script>

<style scoped>
.two-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header-section {
  height: 400px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.header-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
}

.header-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
}

.main-title {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 16px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 24px;
  opacity: 0.9;
}

.main-content {
  max-width: 1200px;
  margin: -80px auto 0;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}

.content-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.feature-img {
  width: 100%;
  height: auto;
  border-radius: 12px;
}

.card-text h2 {
  font-size: 32px;
  color: #1a1a2e;
  margin-bottom: 16px;
}

.card-text p {
  font-size: 18px;
  color: #666;
  margin-bottom: 24px;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 24px 0;
}

.feature-list li {
  font-size: 16px;
  color: #444;
  padding: 8px 0;
  line-height: 1.8;
}

.cta-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(103, 126, 234, 0.4);
}

.stats-section {
  max-width: 1200px;
  margin: 60px auto;
  padding: 40px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
}

.stat-item {
  text-align: center;
  padding: 30px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-4px);
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 16px;
  color: #666;
}

@media (max-width: 768px) {
  .main-title {
    font-size: 32px;
  }

  .subtitle {
    font-size: 18px;
  }

  .content-card {
    grid-template-columns: 1fr;
    padding: 24px;
    margin-top: -40px;
  }

  .card-text h2 {
    font-size: 24px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-number {
    font-size: 28px;
  }
}
</style>
