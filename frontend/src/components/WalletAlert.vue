<template>
  <div v-if="visible" class="wallet-alert-overlay" @click="closeAlert">
    <div class="wallet-alert-container" @click.stop>
      <!-- 感叹号图标 -->
      <div class="alert-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="#ffffff"/>
          <text x="20" y="28" text-anchor="middle" font-size="28" font-weight="bold" fill="#000000">!</text>
        </svg>
      </div>
      
      <!-- 提示文字 -->
      <div class="alert-text">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'Wallet not connected'
  }
})

const emit = defineEmits(['update:visible'])

const closeAlert = () => {
  emit('update:visible', false)
}

// 3秒后自动关闭
let autoCloseTimer = null

const startAutoClose = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
  }
  
  if (props.visible) {
    autoCloseTimer = setTimeout(() => {
      closeAlert()
    }, 3000)
  }
}

// 监听 visible 变化
import { watch } from 'vue'
watch(() => props.visible, (newVal) => {
  if (newVal) {
    startAutoClose()
  }
})
</script>

<style scoped>
/* 遮罩层 */
.wallet-alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10080;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 弹窗容器 */
.wallet-alert-container {
  width: 130px;
  height: 105px;
  background: rgba(89, 88, 89, 0.95);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: scaleIn 0.2s ease-out;
  padding: 16px;
  box-sizing: border-box;
  backdrop-filter: blur(10px);
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 感叹号图标 */
.alert-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 提示文字 */
.alert-text {
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
  line-height: 1.3;
  word-wrap: break-word;
  max-width: 100%;
}
</style>

