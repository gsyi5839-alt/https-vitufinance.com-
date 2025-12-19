<template>
  <!-- 主要卡片容器 - 带三层叠加效果 -->
  <div class="card-stack-wrapper">
    <!-- 第三层(最底部) -->
    <div class="card-layer card-layer-3"></div>
    <!-- 第二层 -->
    <div class="card-layer card-layer-2"></div>
    <!-- 第一层(主卡片) -->
    <div class="one-view">
      <!-- 标题 -->
      <div class="card-header">
        <h2 class="equity-title">{{ t('assetsPage.equityValue') }}</h2>
      </div>

      <!-- 主要金额显示 -->
      <div class="equity-amount">
        <span class="amount-value">{{ walletStore.equityValue }}</span>
        <span v-if="walletStore.isLoadingBalance" class="loading-indicator">...</span>
      </div>

      <!-- 今日盈亏 - 量化收益 -->
      <div class="today-pnl clickable" @click="$emit('open-quantify-history')">
        <span class="pnl-label">{{ t('assetsPage.todayPnl') }}</span>
        <span class="pnl-value" :class="{ positive: todayEarnings > 0 }">
          {{ formatTodayEarnings }} USDT
        </span>
        <span class="pnl-arrow">›</span>
      </div>

      <!-- 推荐奖励 -->
      <div 
        v-if="parseFloat(totalReferralReward) > 0" 
        class="today-pnl clickable" 
        @click="$emit('open-details', 'USDT')"
      >
        <span class="pnl-label">{{ t('assetsPage.referralReward') || 'Referral Reward' }}</span>
        <span class="pnl-value positive">{{ totalReferralReward }} USDT</span>
        <span class="pnl-arrow">›</span>
      </div>

      <!-- 团队奖励 -->
      <div 
        v-if="parseFloat(totalTeamReward) > 0" 
        class="today-pnl clickable" 
        @click="$emit('open-details', 'USDT')"
      >
        <span class="pnl-label">{{ t('assetsPage.teamReward') || 'Team Reward' }}</span>
        <span class="pnl-value positive">{{ totalTeamReward }} USDT</span>
        <span class="pnl-arrow">›</span>
      </div>

      <!-- 资产列表 -->
      <div class="asset-list">
        <!-- USDT -->
        <div class="asset-item">
          <div class="asset-left">
            <img src="/static/USDT/USDT.png" alt="USDT" class="asset-icon" />
            <span class="asset-name">USDT</span>
          </div>
          <div class="asset-right">
            <span class="asset-balance">{{ walletStore.usdtBalance }}</span>
            <button class="details-btn" @click="$emit('open-details', 'USDT')">
              {{ t('assetsPage.details') }}
            </button>
          </div>
        </div>

        <!-- WLD -->
        <div class="asset-item">
          <div class="asset-left">
            <img src="/static/USDT/WLD.png" alt="WLD" class="asset-icon" />
            <span class="asset-name">WLD</span>
          </div>
          <div class="asset-right">
            <span class="asset-balance">{{ walletStore.wldBalance }}</span>
            <button class="details-btn" @click="$emit('open-details', 'WLD')">
              {{ t('assetsPage.details') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 资产权益卡片组件
 * 显示总权益、今日盈亏、推荐奖励、团队奖励和资产列表
 */
import { useI18n } from 'vue-i18n'
import { useWalletStore } from '@/stores/wallet'

const { t } = useI18n()
const walletStore = useWalletStore()

// Props
defineProps({
  todayEarnings: {
    type: Number,
    default: 0
  },
  formatTodayEarnings: {
    type: String,
    default: '0.00'
  },
  totalReferralReward: {
    type: String,
    default: '0.0000'
  },
  totalTeamReward: {
    type: String,
    default: '0.0000'
  }
})

// Emits
defineEmits(['open-quantify-history', 'open-details'])
</script>

<style scoped>
/* 卡片堆叠容器 */
.card-stack-wrapper {
  position: relative;
  width: 100%;
  max-width: 387px;
  margin: 0 auto 24px;
  padding-top: 16px;
}

/* 卡片层 */
.card-layer {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-radius: 24px;
  z-index: 0;
}

.card-layer-3 {
  top: 0;
  width: 90%;
  opacity: 0.3;
}

.card-layer-2 {
  top: 8px;
  width: 95%;
  opacity: 0.5;
}

/* 主卡片 */
.one-view {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
}

.card-header {
  margin-bottom: 16px;
}

.equity-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

/* 金额显示 */
.equity-amount {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-value {
  font-size: 48px;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.loading-indicator {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.6);
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 今日盈亏 */
.today-pnl {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.today-pnl.clickable {
  cursor: pointer;
}

.today-pnl.clickable:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.pnl-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.pnl-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.pnl-value.positive {
  color: #4ade80;
}

.pnl-arrow {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
}

/* 资产列表 */
.asset-list {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.asset-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.asset-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.asset-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.asset-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.asset-balance {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.details-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.details-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* 响应式 */
@media (max-width: 768px) {
  .card-stack-wrapper {
    max-width: 343px;
  }
  
  .one-view {
    padding: 24px 20px;
  }
  
  .amount-value {
    font-size: 40px;
  }
  
  .asset-icon {
    width: 32px;
    height: 32px;
  }
  
  .asset-name {
    font-size: 16px;
  }
  
  .asset-balance {
    font-size: 18px;
  }
}
</style>

