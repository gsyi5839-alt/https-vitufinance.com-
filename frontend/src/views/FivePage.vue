<template>
  <div class="five-page">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <div class="nav-container">
        <h2 class="page-title">{{ t('fivePage.pageTitle') }}</h2>
        <div class="market-selector">
          <button 
            v-for="market in markets" 
            :key="market"
            :class="['market-btn', { active: selectedMarket === market }]"
            @click="selectedMarket = market"
          >
            {{ market }}
          </button>
        </div>
      </div>
    </div>

    <!-- 交易对列表 -->
    <div class="trading-pairs">
      <div class="pairs-header">
        <div v-for="(header, index) in t('fivePage.pairHeader')" :key="index" class="header-item">{{ header }}</div>
      </div>

      <div class="pairs-list">
        <div 
          v-for="pair in filteredPairs" 
          :key="pair.symbol" 
          class="pair-item"
          @click="selectPair(pair)"
        >
          <div class="pair-info">
            <img :src="`${ICON_PATHS.CRYPTO}${pair.icon}`" :alt="pair.base" class="pair-icon" />
            <div class="pair-name">
              <div class="base">{{ pair.base }}</div>
              <div class="quote">{{ pair.quote }}</div>
            </div>
          </div>
          <div class="pair-price">{{ pair.price }}</div>
          <div :class="['pair-change', pair.change > 0 ? 'positive' : 'negative']">
            {{ pair.change > 0 ? '+' : '' }}{{ pair.change }}%
          </div>
          <div class="pair-volume">{{ pair.volume }}</div>
          <div class="pair-action">
            <button class="trade-btn buy">{{ t('fivePage.buyButton') }}</button>
            <button class="trade-btn sell">{{ t('fivePage.sellButton') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ICON_PATHS } from '@/utils/constants'

const { t } = useI18n()

const markets = ref(['USDT', 'BTC', 'ETH'])
const selectedMarket = ref('USDT')

const tradingPairs = ref([
  { base: 'BTC', quote: 'USDT', icon: 'btc.png', price: '$42,350.50', change: 2.45, volume: '$1.2B' },
  { base: 'ETH', quote: 'USDT', icon: 'eth.png', price: '$2,250.30', change: 1.82, volume: '$850M' },
  { base: 'BNB', quote: 'USDT', icon: 'bnb.png', price: '$312.45', change: -0.56, volume: '$420M' },
  { base: 'SOL', quote: 'USDT', icon: 'sol.png', price: '$98.75', change: 5.23, volume: '$680M' },
  { base: 'XRP', quote: 'USDT', icon: 'xrp.png', price: '$0.62', change: 3.14, volume: '$320M' },
  { base: 'ADA', quote: 'USDT', icon: 'ada.png', price: '$0.48', change: -1.25, volume: '$180M' },
  { base: 'DOGE', quote: 'USDT', icon: 'doge.png', price: '$0.089', change: 0.95, volume: '$210M' },
  { base: 'WLD', quote: 'USDT', icon: 'wld.png', price: '$3.25', change: 4.67, volume: '$156M' },
  { base: 'PEPE', quote: 'USDT', icon: 'pepe.png', price: '$0.0000012', change: 8.34, volume: '$95M' },
  { base: 'ARB', quote: 'USDT', icon: 'arb.png', price: '$1.15', change: -2.11, volume: '$240M' },
  { base: 'ETH', quote: 'BTC', icon: 'eth.png', price: '0.053 BTC', change: -0.63, volume: '45K BTC' },
  { base: 'BNB', quote: 'BTC', icon: 'bnb.png', price: '0.0074 BTC', change: -3.01, volume: '12K BTC' },
  { base: 'BNB', quote: 'ETH', icon: 'bnb.png', price: '0.139 ETH', change: -2.45, volume: '85K ETH' },
  { base: 'SOL', quote: 'ETH', icon: 'sol.png', price: '0.044 ETH', change: 3.41, volume: '120K ETH' }
])

const filteredPairs = computed(() => {
  return tradingPairs.value.filter(pair => pair.quote === selectedMarket.value)
})

const selectPair = (pair) => {
  console.log('Selected pair:', pair)
  // 这里可以跳转到具体的交易页面
}
</script>

<style scoped>
.five-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.top-nav {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  margin: 0;
}

.market-selector {
  display: flex;
  gap: 12px;
}

.market-btn {
  padding: 10px 24px;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.market-btn:hover {
  border-color: #667eea;
  background: rgba(103, 126, 234, 0.1);
}

.market-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.trading-pairs {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.pairs-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1.5fr 1.5fr;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.header-item {
  text-align: left;
}

.pairs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pair-item {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1.5fr 1.5fr;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  align-items: center;
}

.pair-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.pair-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pair-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.pair-name {
  display: flex;
  flex-direction: column;
}

.base {
  font-size: 16px;
  font-weight: 600;
}

.quote {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.pair-price {
  font-size: 16px;
  font-weight: 600;
}

.pair-change {
  font-size: 15px;
  font-weight: 600;
}

.pair-change.positive {
  color: #4ade80;
}

.pair-change.negative {
  color: #f87171;
}

.pair-volume {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
}

.pair-action {
  display: flex;
  gap: 8px;
}

.trade-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.trade-btn.buy {
  background: #4ade80;
  color: #0f0f23;
}

.trade-btn.buy:hover {
  background: #22c55e;
  transform: translateY(-2px);
}

.trade-btn.sell {
  background: #f87171;
  color: #fff;
}

.trade-btn.sell:hover {
  background: #ef4444;
  transform: translateY(-2px);
}

@media (max-width: 1024px) {
  .pairs-header,
  .pair-item {
    grid-template-columns: 2fr 1.5fr 1fr 1fr;
  }

  .pair-volume {
    display: none;
  }
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .pairs-header {
    display: none;
  }

  .pair-item {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .pair-info {
    grid-column: 1;
  }

  .pair-price,
  .pair-change {
    font-size: 14px;
  }

  .pair-action {
    width: 100%;
  }

  .trade-btn {
    flex: 1;
  }
}
</style>
