<template>
  <div class="one-page">
    <!-- 头部 -->
    <div class="header">
      <img src="/static/one/1.png" alt="Header" class="header-img" />
    </div>

    <!-- 内容网格 -->
    <div class="content-grid">
      <div v-for="(item, index) in gridItems" :key="index" class="grid-item">
        <img :src="`/static/one/${item.img}`" :alt="translatedItems[index]?.title || ''" class="item-img" />
        <div class="item-overlay">
          <h3>{{ translatedItems[index]?.title || '' }}</h3>
          <p>{{ translatedItems[index]?.description || '' }}</p>
        </div>
      </div>
    </div>

    <!-- 邮箱图标 -->
    <div class="email-section">
      <img src="/static/one/em.png" alt="Email" class="email-icon" />
      <p class="email-text">{{ t('onePage.emailText') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const gridItems = ref([
  { img: '2.png' },
  { img: '3.png' },
  { img: '4.png' },
  { img: '5.png' },
  { img: '6.png' },
  { img: '7.png' },
  { img: '8.png' },
  { img: '9.png' },
  { img: '10.png' }
])

// 从翻译中获取内容
const translatedItems = computed(() => {
  return t('onePage.items')
})
</script>

<style scoped>
.one-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.header {
  width: 100%;
  overflow: hidden;
  position: relative;
}

.header-img {
  width: 100%;
  height: auto;
  display: block;
}

.content-grid {
  padding: 40px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.grid-item {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.grid-item:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(103, 126, 234, 0.3);
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.item-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  padding: 20px;
  transform: translateY(60%);
  transition: transform 0.3s ease;
}

.grid-item:hover .item-overlay {
  transform: translateY(0);
}

.item-overlay h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #fff;
}

.item-overlay p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

.email-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.email-icon {
  width: 80px;
  height: auto;
  margin-bottom: 16px;
}

.email-text {
  font-size: 18px;
  color: #fff;
  font-weight: 500;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    padding: 20px 15px;
    gap: 16px;
  }

  .item-overlay {
    transform: translateY(0);
  }
}
</style>
