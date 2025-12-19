<template>
  <!--
    点击退出功能：
    - 点击页面任意位置都会退出，返回到上一页
    - 支持从 Robot 页面或 Follow 页面进入
  -->
  <div class="caption-page" @click="goBackToRobot">
    <!-- FAQ 标题按钮 -->
    <div class="faq-header">
      <div class="faq-button">FAQ</div>
    </div>

    <!-- 页面内容区域 -->
    <div class="caption-content">
      <!-- FAQ 卡片 1：How does World AIbot work to gain income? -->
      <div class="faq-item">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq1Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content">
          <p>{{ t('captionPage.faq1Content') }}</p>
        </div>
      </div>

      <!-- FAQ 卡片 2：There are two types of AI trend quantification robots -->
      <div class="faq-item faq-item-2">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq2Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content faq-content-2">
          <p>{{ t('captionPage.faq2Content1') }}</p>
          <p class="section-title">{{ t('captionPage.faq2Cex') }}</p>
          <p>{{ t('captionPage.faq2CexContent') }}</p>
          <p class="section-title">{{ t('captionPage.faq2Dex') }}</p>
          <p>{{ t('captionPage.faq2DexContent') }}</p>
        </div>
      </div>

      <!-- FAQ 卡片 3：How to quickly participate in World Albot? -->
      <div class="faq-item faq-item-3">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq3Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content faq-content-3">
          <p>{{ t('captionPage.faq3Step1') }}</p>
          <p>{{ t('captionPage.faq3Step2') }}</p>
          <p>{{ t('captionPage.faq3Step3') }}</p>
          <p>{{ t('captionPage.faq3Step4') }}</p>
        </div>
      </div>

      <!-- FAQ 卡片 4：How to start the World AIbot robot to earn daily income? -->
      <div class="faq-item faq-item-4">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq4Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content faq-content-4">
          <p>{{ t('captionPage.faq4Step1') }}</p>
          <p>{{ t('captionPage.faq4Step2') }}</p>
          <p>{{ t('captionPage.faq4Step3') }}</p>
          <p>{{ t('captionPage.faq4Note1') }}</p>
          <p>{{ t('captionPage.faq4Note2') }}</p>
        </div>
      </div>

      <!-- FAQ 卡片 5：Why do I need to pay a deposit to start a robot to work? -->
      <div class="faq-item faq-item-5">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq5Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content faq-content-5">
          <p>{{ t('captionPage.faq5Content1') }}</p>
          <p>{{ t('captionPage.faq5Content2') }}</p>
        </div>
      </div>

      <!-- FAQ 卡片 6：The robot can achieve 2%-3%/day income. Will production be reduced in the future? -->
      <div class="faq-item faq-item-6">
        <!-- 标题栏 -->
        <div class="faq-title">
          <span>{{ t('captionPage.faq6Title') }}</span>
          <svg class="back-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <!-- 内容区域 - 默认展开显示 -->
        <div class="faq-content faq-content-6">
          <p>{{ t('captionPage.faq6Content1') }}</p>
          <p>{{ t('captionPage.faq6Content2') }}</p>
          <p>{{ t('captionPage.faq6Content3') }}</p>
          <p>{{ t('captionPage.faq6Content4') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * RobotCaption 页面 - FAQ
 * 
 * 路由：/robot/caption
 * 功能：
 * - 展示常见问题解答（FAQ）
 * - 点击页面任意位置返回到上一页
 * - 支持从 Robot 页面或 Follow 页面进入
 */
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

/**
 * 点击任意位置返回上一页
 * 功能说明：
 * - 点击页面任意位置（包括标题、内容、空白区域）都会返回上一页
 * - 支持从 Robot 页面或 Follow 页面进入
 * - 优先返回上一页，如果没有历史记录则跳转到 Robot 页面
 */
const goBackToRobot = () => {
  // 优先返回上一页（支持从不同页面进入）
  if (window.history.length > 1) {
    router.back()
  } else {
    // 如果没有历史记录，默认返回 Robot 页面
    router.push('/robot')
  }
}
</script>

<style scoped>
.caption-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0);
}

/* FAQ 标题区域 */
.faq-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  background: transparent;
}

/* FAQ 按钮样式 - 按照设计图 */
.faq-button {
  height: 36px;
  background: transparent;
  border-radius: 4px;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px 0px, rgba(0, 0, 0, 0.16) 0px 3px 6px 0px inset;
  margin: 0 auto;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: rgb(255, 255, 255);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 40px;
  font-weight: 500;
}

.caption-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* FAQ 卡片样式 */
.faq-item {
  width: 695px;
  max-width: calc(100% - 32px);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 标题栏 - 宽度 695px */
.faq-title {
  width: 695px;
  max-width: 100%;
  height: 71px;
  background: #f5b638;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: #000000;
}

.faq-title span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 返回箭头图标 */
.back-arrow {
  color: #000000;
  flex-shrink: 0;
  cursor: pointer;
}

/* 内容区域 - 尺寸 384.3 x 244，居中显示 */
.faq-content {
  width: 384.3px;
  min-height: 244px;
  max-width: calc(100% - 32px);
  background: #444d63;
  border-radius: 0 0 8px 8px;
  padding: 16px;
  box-sizing: border-box;
  margin-top: 0;
}

.faq-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  font-style: italic;
  color: #ffffff;
  line-height: 1.6;
}

.faq-content p:last-child {
  margin-bottom: 0;
}

/* 小节标题样式 */
.faq-content .section-title {
  font-style: normal;
  font-weight: 700;
  color: #ffffff;
  margin-top: 8px;
  margin-bottom: 4px;
}

/* 手机端适配 */
@media (max-width: 720px) {
  .faq-item {
    width: 336px;
    max-width: calc(100% - 32px);
  }
  
  /* 手机端标题栏 336 x 39 */
  .faq-title {
    width: 336px;
    max-width: 100%;
    height: 39px;
  }
  
  /* 手机端第一个卡片内容区域 302.39 x 138 */
  .faq-content {
    width: 302.39px;
    min-height: 138px;
    max-width: calc(100% - 16px);
  }
  
  /* 手机端第二个卡片内容区域 302.39 x 258 */
  .faq-content-2 {
    width: 302.39px;
    min-height: 258px;
    max-width: calc(100% - 16px);
  }
  
  /* 手机端第三个卡片内容区域 302.39 x 146 */
  .faq-content-3 {
    width: 302.39px;
    min-height: 146px;
    max-width: calc(100% - 16px);
  }
  
  /* 手机端第四个卡片内容区域 302.39 x 224 */
  .faq-content-4 {
    width: 302.39px;
    min-height: 224px;
    max-width: calc(100% - 16px);
  }
  
  /* 手机端第五个卡片内容区域 302.39 x 190 */
  .faq-content-5 {
    width: 302.39px;
    min-height: 190px;
    max-width: calc(100% - 16px);
  }
  
  /* 手机端第六个卡片内容区域 302.39 x 445 */
  .faq-content-6 {
    width: 302.39px;
    min-height: 445px;
    max-width: calc(100% - 16px);
  }
  
  .caption-content {
    padding: 16px;
  }
}
</style>
