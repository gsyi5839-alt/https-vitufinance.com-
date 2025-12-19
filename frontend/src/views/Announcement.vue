<template>
  <div class="announcement-page">
    <!-- 标题（点击返回首页） -->
    <div class="page-title" @click="goBack">
      <h1>{{ t('announcementPage.title') }}</h1>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p class="loading-text">{{ t('announcementPage.loading') }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && announcements.length === 0" class="empty-container">
      <p class="empty-text">{{ t('announcementPage.noAnnouncements') }}</p>
    </div>

    <!-- 公告列表 -->
    <div v-else class="announcement-list">
      <div 
        v-for="item in announcements" 
        :key="item.id"
        class="list-item"
        :class="{ 'expanded': expandedItems.has(item.id) }"
        @click="toggleItem(item.id)"
      >
        <div class="item-header">
          <p class="item-text">{{ item.title }}</p>
          <div class="arrow-icon" :class="{ expanded: expandedItems.has(item.id) }">
            ▼
          </div>
        </div>
        <!-- 展开的详细内容 -->
        <div v-if="expandedItems.has(item.id) && item.content" class="item-content" v-html="item.content">
        </div>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import BottomNav from '../components/BottomNav.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { getAnnouncements } from '../api/announcement'

const { t } = useI18n()
const router = useRouter()

// 公告列表数据
const announcements = ref([])
const loading = ref(true)
const expandedItems = ref(new Set())

// 返回首页
const goBack = () => {
  router.push('/')
}

// 切换展开/收起
const toggleItem = (id) => {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id)
  } else {
    expandedItems.value.add(id)
  }
  // 触发响应式更新
  expandedItems.value = new Set(expandedItems.value)
}

// 获取公告列表
const fetchAnnouncements = async () => {
  try {
    loading.value = true
    const response = await getAnnouncements()
    
    if (response.code === 200 && response.info?.notice) {
      announcements.value = response.info.notice
    } else {
      ElMessage.warning(response.msg || t('announcementPage.loadFailed'))
    }
  } catch (error) {
    console.error('获取公告失败:', error)
    ElMessage.error(t('announcementPage.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchAnnouncements()
})
</script>

<style scoped>
.announcement-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  padding: 140px 16px 100px;
  color: var(--UI-FG-0, #ffffff);
}

/* 标题（点击返回首页） */
.page-title {
  width: 339px;
  height: 36px;
  max-width: 100%;
  margin: 0 auto 24px;
  background: #5a6a7d;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-title:hover {
  background: #66788d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.page-title:active {
  transform: scale(0.98);
}

.page-title h1 {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  line-height: 36px;
  white-space: nowrap;
}

/* 加载状态 */
.loading-container,
.empty-container {
  max-width: 400px;
  margin: 40px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-text,
.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 公告列表 */
.announcement-list {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 列表项 */
.list-item {
  width: 339px;
  min-height: 125px;
  height: 125px;
  max-width: 100%;
  background: #3d4a5c;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  margin: 0 auto;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

/* 展开状态 */
.list-item.expanded {
  height: 403px;
  overflow-y: auto;
}

.list-item:hover {
  background: #465566;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.item-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
  color: #ffffff;
  margin: 0;
  padding-right: 32px;
  word-wrap: break-word;
  max-width: 266px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.arrow-icon.expanded {
  transform: rotate(180deg);
}

/* 展开的详细内容 */
.item-content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  animation: slideDown 0.3s ease;
}

.item-content :deep(p) {
  margin: 0 0 8px 0;
}

.item-content :deep(br) {
  display: block;
  content: "";
  margin: 4px 0;
}

.item-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .announcement-page {
    padding: 130px 12px 100px;
  }

  .page-title {
    width: 100%;
    max-width: 339px;
  }

  .list-item {
    width: 100%;
    max-width: 339px;
    min-height: 125px;
    height: 125px;
  }

  .list-item.expanded {
    height: 403px;
  }

  .item-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .announcement-page {
    padding: 110px 12px 90px;
  }

  .page-title {
    height: 34px;
  }

  .page-title h1 {
    font-size: 16px;
    line-height: 34px;
  }

  .list-item {
    padding: 12px;
  }

  .item-text {
    font-size: 12px;
    padding-right: 28px;
  }

  .arrow-icon {
    font-size: 11px;
  }

  .item-content {
    font-size: 12px;
  }
}

@media (max-width: 375px) {
  .announcement-page {
    padding: 100px 10px 80px;
  }

  .page-title {
    height: 32px;
  }

  .page-title h1 {
    font-size: 14px;
    line-height: 32px;
  }

  .list-item {
    padding: 10px;
  }
}
</style>

