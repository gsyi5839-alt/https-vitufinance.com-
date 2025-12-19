<template>
  <div v-if="visible" class="prompt-overlay" @click="handleCancel">
    <div class="prompt-container" @click.stop>
      <!-- 标题 -->
      <div class="prompt-title">{{ t('robotPage.promptTitle') }}</div>
      
      <!-- 内容 -->
      <div class="prompt-content">{{ t('robotPage.usdtInsufficient') }}</div>
      
      <!-- 按钮区域 -->
      <div class="prompt-buttons">
        <button class="btn-cancel" @click="handleCancel">{{ t('robotPage.cancelBtn') }}</button>
        <button class="btn-sure" @click="handleSure">{{ t('robotPage.sureBtn') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const handleCancel = () => {
  emit('update:visible', false)
}

const handleSure = () => {
  emit('update:visible', false)
  emit('confirm')
}
</script>

<style scoped>
/* 遮罩层 */
.prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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

/* 弹窗容器 - 尺寸 349x150 */
.prompt-container {
  width: 349px;
  height: 150px;
  background: rgba(50, 50, 55, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  box-shadow: 0 6px 6px rgba(0, 0, 0, 0.99);
  padding: 18px 24px;
  box-sizing: border-box;
  animation: scaleIn 0.2s ease-out;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 标题 - 提示 */
.prompt-title {
  font-size: 20px;
  font-family: "PingFang SC", "PingFang SC-Bold", -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 700;
  text-align: center;
  color: rgb(245, 182, 56);
}

/* 内容 - USDT餘額不足 */
.prompt-content {
  font-size: 15px;
  font-weight: 400;
  text-align: center;
  color: #ffffff;
  line-height: 1.4;
}

/* 按钮区域 */
.prompt-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

/* 取消按钮 */
.btn-cancel {
  flex: 1;
  height: 40px;
  background: rgba(150, 150, 150, 0.8);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-family: "PingFang SC", "PingFang SC-Heavy", -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(130, 130, 130, 0.9);
}

.btn-cancel:active {
  transform: scale(0.98);
}

/* 确认按钮 */
.btn-sure {
  flex: 1;
  height: 40px;
  background: rgb(245, 182, 56);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-family: "PingFang SC", "PingFang SC-Heavy", -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-sure:hover {
  background: rgb(255, 192, 66);
}

.btn-sure:active {
  transform: scale(0.98);
}

/* 移动端适配 */
@media (max-width: 375px) {
  .prompt-container {
    width: 320px;
    height: 140px;
    padding: 16px 20px;
  }
  
  .prompt-title {
    font-size: 18px;
  }
  
  .prompt-content {
    font-size: 14px;
  }
  
  .btn-cancel,
  .btn-sure {
    height: 38px;
    font-size: 15px;
  }
}
</style>

