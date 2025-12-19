<template>
  <!-- 存款/提款按钮容器 -->
  <div class="action-buttons-container">
    <!-- Deposit 按钮 -->
    <button class="action-btn deposit-btn" @click="$emit('open-deposit')">
      <img src="/static/QIANBAO/提款.png" alt="Deposit" class="btn-icon" />
      <span class="btn-text">{{ t('assetsPage.deposit') }}</span>
    </button>

    <!-- Withdraw 按钮 -->
    <button class="action-btn withdraw-btn" @click="$emit('open-withdraw')">
      <img src="/static/QIANBAO/存款.png" alt="Withdraw" class="btn-icon" />
      <span class="btn-text">{{ t('assetsPage.withdraw') }}</span>
    </button>
  </div>
</template>

<script setup>
/**
 * 资产操作按钮组件
 * 包含存款和提款按钮
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Emits
defineEmits(['open-deposit', 'open-withdraw'])
</script>

<style scoped>
/* 按钮容器 */
.action-buttons-container {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 0 16px;
  margin-bottom: 24px;
  max-width: 387px;
  margin-left: auto;
  margin-right: auto;
}

/* 操作按钮 */
.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.action-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
}

.action-btn:active {
  transform: translateY(-2px);
}

.btn-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

/* 响应式 */
@media (max-width: 768px) {
  .action-buttons-container {
    max-width: 343px;
    gap: 12px;
  }
  
  .action-btn {
    padding: 20px 12px;
    gap: 8px;
  }
  
  .btn-icon {
    width: 40px;
    height: 40px;
  }
  
  .btn-text {
    font-size: 14px;
  }
}
</style>

