<template>
  <div class="crypto-card">
    <div class="crypto-card-icon">
      <img :src="icon" :alt="symbol" />
    </div>
    <div class="crypto-card-info">
      <div class="crypto-card-name">{{ name }}</div>
      <div class="crypto-card-symbol">{{ symbol }}</div>
    </div>
    
    <!-- 迷你图表 -->
    <div class="crypto-card-chart">
      <LoadingDots v-if="isLoading" />
      <CryptoChart 
        v-else
        :width="100" 
        :height="40" 
        :color="chartColor" 
        :is-positive="isPositive"
        :data="chartData"
      />
    </div>

    <div class="crypto-card-price">
      <div class="price-value">{{ price }}</div>
      <div :class="['price-change', changeType]">{{ change }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CryptoChart from './CryptoChart.vue'
import LoadingDots from './LoadingDots.vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  price: {
    type: String,
    default: '$0'
  },
  change: {
    type: String,
    default: '-NaN%'
  },
  chartData: {
    type: Array,
    default: () => []
  }
})

const isLoading = computed(() => {
  return !props.chartData || props.chartData.length === 0
})

const changeType = computed(() => {
  if (props.change.startsWith('+')) return 'positive'
  if (props.change.startsWith('-')) return 'negative'
  return ''
})

const isPositive = computed(() => {
  return props.change.startsWith('+')
})

const chartColor = computed(() => {
  return isPositive.value ? '#10b981' : '#ef4444'
})
</script>

<style scoped>
/* 加密货币卡片 - PC端 380×85 */
.crypto-card {
  width: 380px;
  height: 85px;
  background: var(--UI-CARD-BG);
  border-radius: 12px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.crypto-card:hover {
  background: var(--UI-CARD-BG);
  border-color: rgba(255, 255, 255, 0.03);
}

/* 图标 */
.crypto-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.crypto-card-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 币种信息 */
.crypto-card-info {
  width: 75px; /* 固定宽度，防止挤压图表 */
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.crypto-card-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crypto-card-symbol {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

/* 图表区域 */
.crypto-card-chart {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 价格信息 */
.crypto-card-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 100px; /* 确保价格不换行 */
  flex-shrink: 0;
}

.price-value {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.price-change {
  font-size: 13px;
  font-weight: 500;
}

.price-change.positive {
  color: #10b981;
}

.price-change.negative {
  color: #ef4444;
}

/* 移动端适配 - 使用响应式宽度 */
@media (max-width: 768px) {
  .crypto-card {
    width: 100%;           /* 响应式宽度 */
    max-width: 360px;      /* 最大宽度限制 */
    height: 80px;
    padding: 0 12px;
    gap: 8px;
  }

  .crypto-card-icon {
    width: 40px;
    height: 40px;
  }

  .crypto-card-info {
    width: 65px;
  }

  .crypto-card-name {
    font-size: 13px;
  }

  .crypto-card-symbol {
    font-size: 16px;
  }

  .crypto-card-price {
    min-width: 95px;
  }

  .price-value {
    font-size: 14px;
  }

  .price-change {
    font-size: 12px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 400px) {
  .crypto-card {
    width: 100%;
    max-width: none;       /* 移除最大宽度限制，完全填充 */
    height: 75px;
    padding: 0 10px;
    gap: 6px;
  }

  .crypto-card-icon {
    width: 36px;
    height: 36px;
  }

  .crypto-card-info {
    width: 55px;
  }

  .crypto-card-name {
    font-size: 12px;
  }

  .crypto-card-symbol {
    font-size: 14px;
  }

  .crypto-card-price {
    min-width: 85px;
  }

  .price-value {
    font-size: 13px;
  }

  .price-change {
    font-size: 11px;
  }
}
</style>
