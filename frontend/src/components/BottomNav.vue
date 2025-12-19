<template>
  <nav class="bottom-nav" :class="{ 'in-popup': inPopup }">
    <router-link 
      v-for="item in navItems" 
      :key="item.path" 
      :to="item.path" 
      class="nav-item"
      :class="{ active: isActive(item.path) }"
      @click="handleNavClick(item.path, $event)"
    >
      <div class="nav-icon">
        <img :src="isActive(item.path) ? item.activeIcon : item.icon" :alt="item.label" />
      </div>
      <div class="nav-label">
        <!-- 选中状态显示圆点 -->
        <span v-if="isActive(item.path)" class="active-dot">·</span>
        <!-- 未选中状态显示文字 -->
        <span v-else class="label-text">{{ t(item.label) }}</span>
      </div>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()

const props = defineProps({
  inPopup: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()

const navItems = [
  { path: '/', icon: '/static/index/1.png', activeIcon: '/static/SHOUYE/1.png', label: 'bottomNav.home' },
  { path: '/robot', icon: '/static/index/2.png', activeIcon: '/static/SHOUYE/2.png', label: 'bottomNav.robot' },
  { path: '/invite', icon: '/static/index/3.png', activeIcon: '/static/SHOUYE/3.png', label: 'bottomNav.invite' },
  { path: '/follow', icon: '/static/index/4.png', activeIcon: '/static/SHOUYE/4.png', label: 'bottomNav.follow' },
  { path: '/wallet', icon: '/static/index/5.png', activeIcon: '/static/SHOUYE/5.png', label: 'bottomNav.assets' }
]

const isActive = (path) => {
  return route.path === path
}

// 处理导航点击事件
const handleNavClick = (path, event) => {
  // 如果点击的是首页图标，并且当前已经在首页
  if (path === '/' && route.path === '/') {
    event.preventDefault() // 阻止默认的路由跳转行为
    // 平滑滚动到页面顶部
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 20px; /* 稍微上浮一点，或者贴底但有圆角 */
  left: 0;
  right: 0;
  margin: 0 auto; /* 居中 */
  width: 404px; /* 标准尺寸 404px */
  height: 67px; /* 标准高度 67px */
  background: #222226;
  border-radius: 12px; /* 与卡片一致的圆角 */
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.03); /* 与卡片一致的边框 */
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 弹窗内的导航栏样式 */
.bottom-nav.in-popup {
  position: relative;
  bottom: 0;
  width: 100%;
  height: 75px;
  border-radius: 0;
  margin: 0;
  background: #2a2a2e;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-left: none;
  border-right: none;
  border-bottom: none;
  box-shadow: none;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.3s ease;
  height: 100%;
  flex: 1;
}

.nav-item.active {
  color: #f59e0b;
}

.nav-icon {
  width: 28px; /* 增大图标以适应67px高度 */
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.nav-label {
  font-size: 11px; /* 增大字体 */
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px; /* 增加与图标的间距 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 16px; /* 确保高度一致 */
}

/* 选中状态的圆点 */
.active-dot {
  color: rgb(245, 182, 56); /* 金黄色 #f5b638 */
  font-size: 24px; /* 圆点大小 */
  line-height: 1;
  font-weight: bold;
}

/* 未选中状态的文字 */
.label-text {
  font-size: 11px;
  font-weight: 500;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .bottom-nav {
    width: 90%; /* 移动端自适应宽度，最大不超过404px */
    max-width: 404px;
    bottom: 16px;
  }

  .bottom-nav.in-popup {
    width: 100%;
    height: 67px;
  }
}

/* 小屏手机适配 */
@media (max-width: 420px) {
  .bottom-nav {
    width: 95%; /* 小屏占比更大 */
    max-width: 404px;
    bottom: 12px;
  }
}
</style>
