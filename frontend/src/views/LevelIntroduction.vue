<template>
  <!--
    点击退出功能：
    - 点击页面任意位置都会退出，返回到 Invite 页面
  -->
  <div class="level-introduction-page" @click="handleExit">
    <!-- 内容容器 - 点击内容也会触发退出 -->
    <div class="content-container">
      <!-- 图标 -->
      <div class="icon-wrapper">
        <img src="/static/YAOQI/2.png" alt="Broker System Icon" class="broker-icon" />
      </div>
      
      <!-- BROKER SYSTEM 文字 -->
      <div class="title-wrapper">
        <h1 class="broker-title">{{ t('levelPage.title') }}</h1>
      </div>

      <!-- LEVEL 1 BROKER 卡片 -->
      <div class="level-card-wrapper">
        <!-- LEVEL 1 BROKER 标题（半截显示在卡片上方） -->
        <div class="level-title-badge level-1-badge">
          <span class="level-title-text">{{ t('levelPage.level1') }}</span>
        </div>
        
        <!-- 卡片内容容器 -->
        <div class="level-card">
          <div class="level-content">
            <p class="level-text">
              <strong>{{ t('levelPage.conditions') }}:</strong> {{ t('levelPage.level1Conditions') }}
            </p>
            <p class="level-text">
              <strong>{{ t('levelPage.salary') }}:</strong> {{ t('levelPage.level1Salary') }}
            </p>
          </div>
        </div>
      </div>

      <!-- LEVEL 2 BROKER 卡片 -->
      <div class="level-card-wrapper">
        <div class="level-title-badge level-2-badge">
          <span class="level-title-text">{{ t('levelPage.level2') }}</span>
        </div>
        <div class="level-card">
          <div class="level-content">
            <p class="level-text">
              <strong>{{ t('levelPage.conditions') }}:</strong> {{ t('levelPage.level2Conditions') }}
            </p>
            <p class="level-text">
              <strong>{{ t('levelPage.salary') }}:</strong> {{ t('levelPage.level2Salary') }}
            </p>
          </div>
        </div>
      </div>

      <!-- LEVEL 3 BROKER 卡片 -->
      <div class="level-card-wrapper">
        <div class="level-title-badge level-3-badge">
          <span class="level-title-text">{{ t('levelPage.level3') }}</span>
        </div>
        <div class="level-card">
          <div class="level-content">
            <p class="level-text">
              <strong>{{ t('levelPage.conditions') }}:</strong> {{ t('levelPage.level3Conditions') }}
            </p>
            <p class="level-text">
              <strong>{{ t('levelPage.salary') }}:</strong> {{ t('levelPage.level3Salary') }}
            </p>
          </div>
        </div>
      </div>

      <!-- LEVEL 4 BROKER 卡片 -->
      <div class="level-card-wrapper">
        <div class="level-title-badge level-4-badge">
          <span class="level-title-text">{{ t('levelPage.level4') }}</span>
        </div>
        <div class="level-card">
          <div class="level-content">
            <p class="level-text">
              <strong>{{ t('levelPage.conditions') }}:</strong> {{ t('levelPage.level4Conditions') }}
            </p>
            <p class="level-text">
              <strong>{{ t('levelPage.salary') }}:</strong> {{ t('levelPage.level4Salary') }}
            </p>
          </div>
        </div>
      </div>

      <!-- LEVEL 5 BROKER 卡片 -->
      <div class="level-card-wrapper">
        <div class="level-title-badge level-5-badge">
          <span class="level-title-text">{{ t('levelPage.level5') }}</span>
        </div>
        <div class="level-card">
          <div class="level-content">
            <p class="level-text">
              <strong>{{ t('levelPage.conditions') }}:</strong> {{ t('levelPage.level5Conditions') }}
            </p>
            <p class="level-text">
              <strong>{{ t('levelPage.salary') }}:</strong> {{ t('levelPage.level5Salary') }}
            </p>
          </div>
        </div>
      </div>

      <!-- 底部 Note（按截图补齐） -->
      <div class="note-wrapper">
        <div class="note-card">
          <p class="note-text">
            <strong>{{ t('levelPage.note') }}:</strong> {{ t('levelPage.noteContent') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * LevelIntroduction 页面 - BROKER SYSTEM
 * 
 * 路由：/invite/level-introduction
 * 功能：
 * - 展示 LEVEL 1~5 BROKER 等级规则 + 底部 Note
 * - 当前为静态展示（后续可改为从真实 API/数据库读取）
 * - 点击页面空白区域退出（参考钱包 Details 抽屉写法）
 */

import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

/**
 * 处理点击任意位置退出
 * 功能说明：
 * - 点击页面任意位置（包括内容区域）都会触发退出
 * - 优先返回上一页，如果没有历史记录则跳转到 /invite
 */
const handleExit = () => {
  // 退出逻辑：优先返回上一页，无历史则跳转到 /invite
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/invite')
  }
}
</script>

<style scoped>
/* Level Introduction 页面样式 */
.level-introduction-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a1e 0%, #0f0f12 100%);
  padding: 124px 20px 100px 20px; /* 顶部padding：导航栏高度108px + 间距16px = 124px */
  display: flex;
  justify-content: center;
}

/* 内容容器 */
.content-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px; /* 图标和标题之间的间距 */
  width: 100%;
  padding-bottom: 40px;
}

/* 图标容器 */
.icon-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Broker System 图标 */
.broker-icon {
  width: 128px;
  height: 128px;
  object-fit: contain;
  animation: fadeIn 0.5s ease;
}

/* 标题容器 */
.title-wrapper {
  width: 100%;
  max-width: 463px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* BROKER SYSTEM 标题 */
.broker-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  text-align: center;
  letter-spacing: 2px;
  line-height: 42px;
  white-space: nowrap;
}

/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* LEVEL 1 BROKER 卡片包装器 */
.level-card-wrapper {
  position: relative;
  width: 432px;
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 第一个卡片（与 BROKER SYSTEM 的间距） */
.level-card-wrapper:first-of-type {
  margin-top: 25px;
}

/* 其他卡片之间的间距 - 考虑到标题显示一半，实际间距需要减去标题的一半 */
.level-card-wrapper:not(:first-of-type) {
  margin-top: -11px; /* 实际视觉间距约 8px (19px - 11px = 8px) */
}

/* LEVEL 1 BROKER 标题徽章（显示一半在卡片上方） */
.level-title-badge {
  width: 330px;
  height: 38px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  margin-bottom: -19px; /* 让标题显示一半 */
}

/* 各个等级的背景图片 */
.level-1-badge {
  background-image: url('/static/JIESHOU/1.png');
}

.level-2-badge {
  background-image: url('/static/JIESHOU/2.png');
}

.level-3-badge {
  background-image: url('/static/JIESHOU/3.png');
}

.level-4-badge {
  background-image: url('/static/JIESHOU/4.png');
}

.level-5-badge {
  background-image: url('/static/JIESHOU/5.png');
}

.level-title-text {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1e;
  letter-spacing: 1px;
  text-align: center;
  opacity: 0;
  /* 隐藏文字，因为图片本身包含文字 */
}

/* LEVEL 1 卡片容器 */
.level-card {
  width: 432px;
  height: 154px;
  background: linear-gradient(135deg, #2a2d35 0%, #1f2229 100%);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 18px 18px 18px;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 卡片内容 */
.level-content {
  width: 396px;
  max-height: 100px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 隐藏滚动条 */
.level-content::-webkit-scrollbar {
  width: 4px;
}

.level-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.level-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.level-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 文字样式 */
.level-text {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 12px 0;
  text-align: left;
}

.level-text:last-child {
  margin-bottom: 0;
}

.level-text strong {
  color: #fff;
  font-weight: 600;
}

/* Note 区域（底部说明卡片） */
.note-wrapper {
  width: 432px;
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.note-card {
  width: 432px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 18px;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.note-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
}

.note-text strong {
  color: #fff;
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .level-introduction-page {
    padding: 100px 16px 80px 16px;
  }

  .content-container {
    gap: 50px;
    padding-bottom: 30px;
  }

  .icon-wrapper {
    width: 120px;
    height: 120px;
  }

  .broker-icon {
    width: 100px;
    height: 100px;
  }

  .title-wrapper {
    width: 350px;
    height: auto;
  }

  .broker-title {
    font-size: 26px;
    letter-spacing: 1.5px;
  }

  .level-card-wrapper {
    width: 360px;
    margin-top: 20px;
  }

  .level-title-badge {
    width: 280px;
    height: 34px;
  }

  .level-title-text {
    font-size: 13px;
  }

  .level-card {
    width: 360px;
    height: 140px;
    padding: 20px 14px 14px 14px;
  }

  .level-content {
    width: 330px;
  }

  .level-text {
    font-size: 11px;
  }

  .note-wrapper,
  .note-card {
    width: 360px;
  }
}

@media (max-width: 480px) {
  .level-introduction-page {
    padding: 90px 12px 80px 12px;
  }

  .content-container {
    gap: 40px;
    padding-bottom: 20px;
  }

  .icon-wrapper {
    width: 100px;
    height: 100px;
  }

  .broker-icon {
    width: 80px;
    height: 80px;
  }

  .title-wrapper {
    width: 320px;
    height: auto;
  }

  .broker-title {
    font-size: 22px;
    letter-spacing: 1px;
  }

  .level-card-wrapper {
    width: 320px;
    margin-top: 18px;
  }

  .level-title-badge {
    width: 250px;
    height: 32px;
  }

  .level-title-text {
    font-size: 12px;
    letter-spacing: 0.5px;
  }

  .level-card {
    width: 320px;
    height: 130px;
    padding: 18px 12px 12px 12px;
  }

  .level-content {
    width: 296px;
  }

  .level-text {
    font-size: 10px;
    line-height: 1.5;
  }

  .note-wrapper,
  .note-card {
    width: 320px;
  }
}
</style>

