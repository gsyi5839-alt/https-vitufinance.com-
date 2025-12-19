<template>
  <section class="market-section">
    <h2 class="market-title">{{ t('homePage.marketTitle') }}</h2>
    
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
      <CryptoCard
        v-for="crypto in cryptoList"
        :key="crypto.symbol"
        :name="crypto.name"
        :symbol="crypto.symbol"
        :icon="crypto.icon"
        :price="crypto.price"
        :change="crypto.change"
        :chart-data="crypto.chartData"
      />
    </div>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import CryptoCard from './CryptoCard.vue'
import { useCryptoMarket } from '@/composables/useCryptoMarket'
import { CRYPTO_LIST, ICON_PATHS } from '@/utils/constants'

const { t } = useI18n()

// 初始化加密货币列表（使用常量配置）
const initialCryptoList = CRYPTO_LIST.map(crypto => ({
  ...crypto,
  icon: `${ICON_PATHS.CRYPTO}${crypto.icon}`,
  price: '$0.00',
  change: '0.00%',
  chartData: []
}))

// 使用 Composable 管理市场数据（消除重复代码）
const { 
  cryptoList, 
  loading, 
  error, 
  fetchMarketData 
} = useCryptoMarket(initialCryptoList)
</script>

<style scoped>
/* Market Section */
.market-section {
  padding: 0 16px;
  margin-bottom: 24px; /* 与下方任务区域的间距 */
}

.market-title {
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  color: #fff;
  margin: 0 0 24px 0;
}

.crypto-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

/* Loading 状态 */
.loading-container {
  text-align: center;
  padding: 40px 20px;
  color: #fff;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error 状态 */
.error-container {
  text-align: center;
  padding: 40px 20px;
  color: #fff;
}

.error-message {
  color: #ff6b6b;
  margin-bottom: 16px;
  font-size: 14px;
}

.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}

.retry-btn:hover {
  transform: translateY(-2px);
}
</style>
