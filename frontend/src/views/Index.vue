<template>
  <div class="index-page">
    <!-- 头部横幅 -->
    <div class="header-banner">
      <img :src="`${ICON_PATHS.INDEX}1_s.png`" alt="Banner" class="banner-img" />
    </div>

    <!-- 加密货币列表 -->
    <div class="crypto-section">
      <h2 class="section-title">{{ t('indexPage.sectionTitle') }}</h2>
      
      <!-- Loading 状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{ t('common.loading') || '加载市场数据中...' }}</p>
      </div>

      <!-- Error 状态 -->
      <div v-else-if="error" class="error-container">
        <p class="error-message">{{ error }}</p>
        <button @click="fetchMarketData" class="retry-btn">{{ t('common.retry') || '重试' }}</button>
      </div>

      <!-- 数据列表 -->
      <div v-else class="crypto-list">
        <div v-for="crypto in cryptoList" :key="crypto.symbol" class="crypto-item">
          <img :src="`${ICON_PATHS.CRYPTO}${crypto.icon}`" :alt="crypto.name" class="crypto-icon" />
          <div class="crypto-info">
            <div class="crypto-name">{{ crypto.name }}</div>
            <div class="crypto-symbol">{{ crypto.symbol }}</div>
          </div>
          <div class="crypto-price">
            <div class="price">{{ crypto.price }}</div>
            <div :class="['change', getChangeClass(crypto.change)]">
              {{ typeof crypto.change === 'string' ? crypto.change : (crypto.change > 0 ? '+' : '') + crypto.change + '%' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能特性区 -->
    <div class="features-section">
      <div v-for="(img, index) in featureImages" :key="index" class="feature-item">
        <img :src="`${ICON_PATHS.INDEX}${img}`" :alt="`Feature ${index + 1}`" class="feature-img" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCryptoMarket } from '@/composables/useCryptoMarket'
import { CRYPTO_LIST, ICON_PATHS } from '@/utils/constants'

const { t } = useI18n()

// 初始化加密货币列表（添加默认值）
const initialCryptoList = CRYPTO_LIST.map(crypto => ({
  ...crypto,
  price: '$0.00',
  change: 0,
  chartData: []
}))

// 使用 Composable 管理市场数据
const { 
  cryptoList, 
  loading, 
  error, 
  fetchMarketData 
} = useCryptoMarket(initialCryptoList)

// 功能特性图片
const featureImages = ref(['2.png', '3.png', '4.png', '5.png'])

// 计算涨跌幅的 CSS 类
const getChangeClass = (change) => {
  const changeValue = typeof change === 'string' 
    ? parseFloat(change.replace('%', '')) 
    : change
  return changeValue > 0 ? 'positive' : changeValue < 0 ? 'negative' : 'neutral'
}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 20px;
}

.header-banner {
  width: 100%;
  overflow: hidden;
}

.banner-img {
  width: 100%;
  height: auto;
  display: block;
}

.crypto-section {
  padding: 20px;
}

.section-title {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.crypto-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.crypto-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.crypto-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.crypto-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.crypto-info {
  flex: 1;
}

.crypto-name {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.crypto-symbol {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.crypto-price {
  text-align: right;
}

.price {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.change {
  font-size: 14px;
  font-weight: 500;
}

.change.positive {
  color: #4ade80;
}

.change.negative {
  color: #f87171;
}

.change.neutral {
  color: rgba(255, 255, 255, 0.6);
}

/* Loading 状态 */
.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: #fff;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error 状态 */
.error-container {
  text-align: center;
  padding: 60px 20px;
  color: #fff;
}

.error-message {
  color: #ff6b6b;
  margin-bottom: 20px;
  font-size: 16px;
}

.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.retry-btn:hover {
  transform: translateY(-2px);
}

.features-section {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.feature-item {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.feature-img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.feature-img:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .crypto-section {
    padding: 15px;
  }

  .section-title {
    font-size: 20px;
  }

  .features-section {
    grid-template-columns: 1fr;
    padding: 15px;
  }
}
</style>
