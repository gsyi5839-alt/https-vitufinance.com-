<template>
  <div class="announcement-banner" @click="goToAnnouncement">
    <svg class="icon-speaker" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L3 5H1V11H3L8 15V1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M11 5.5C11.5 6 12 7 12 8C12 9 11.5 10 11 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M13 3.5C14 4.5 15 6 15 8C15 10 14 11.5 13 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <div class="announcement-text-container">
      <span class="announcement-text">{{ t('homePage.announcement') }}</span>
    </div>
    <span class="icon-arrow">›</span>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const goToAnnouncement = () => {
  router.push('/announcement')
}
</script>

<style scoped>
.announcement-banner {
  background: rgb(29, 33, 41);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 12px 16px;
  margin: 0 auto 16px;
  max-width: 358px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  /* 固定高度确保所有页面一致 */
  height: 44px;
  min-height: 44px;
  box-sizing: border-box; /* 确保padding计入总高度 */
}

.announcement-banner:hover {
  background: rgb(35, 40, 50);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.icon-speaker {
  color: rgb(255, 255, 255);
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.announcement-text-container {
  flex: 1;
  overflow: hidden;
  min-width: 0;
  /* 确保容器高度不会撑开父元素 */
  display: flex;
  align-items: center;
}

.announcement-text {
  color: rgb(255, 255, 255);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  display: block;
  white-space: nowrap; /* 强制单行显示 */
  overflow: hidden;
  text-overflow: ellipsis; /* 超长显示省略号 */
  width: 100%; /* 确保宽度正确 */
}

.icon-arrow {
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  flex-shrink: 0;
  font-weight: 300;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .announcement-banner {
    max-width: calc(100% - 32px);
    margin: 0 16px 16px;
    padding: 10px 14px;
    /* 固定高度确保移动端所有页面一致 */
    height: 44px;
    min-height: 44px;
    box-sizing: border-box;
  }
  
  .icon-speaker {
    width: 16px;
    height: 16px;
  }
  
  .announcement-text {
    font-size: 12px;
  }
  
  .icon-arrow {
    font-size: 18px;
  }
}

/* 小屏幕适配 */
@media (max-width: 360px) {
  .announcement-banner {
    margin: 0 12px 12px;
    padding: 8px 12px;
    /* 小屏也保持固定高度 */
    height: 44px;
    min-height: 44px;
    box-sizing: border-box;
  }
  
  .announcement-text {
    font-size: 11px;
  }
}
</style>

