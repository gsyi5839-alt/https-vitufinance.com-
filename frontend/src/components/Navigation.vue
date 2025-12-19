<template>
  <!-- 护眼模式遮罩 -->
  <div v-if="eyeCareMode" class="eye-care-overlay"></div>
  
  <nav class="navigation" :class="{ 'scrolled': isScrolled }" :style="{ backgroundColor: `rgba(0, 0, 0, ${scrollOpacity})` }">
    <div class="nav-container">
      <!-- Left Side - Logo (点击切换护眼模式) -->
      <div class="nav-left">
        <img 
          src="/static/one/1.png" 
          alt="Logo" 
          class="logo-icon" 
          :class="{ 'eye-care-active': eyeCareMode }"
          draggable="false"
          @click="toggleEyeCareMode"
          :title="eyeCareMode ? 'Disable Eye Care Mode' : 'Enable Eye Care Mode'"
        />
      </div>

      <!-- Center - Connect Wallet / Wallet Status -->
      <div class="nav-center" @click="handleWalletClick">
        <img src="/static/YAOQI/10.png" alt="Wallet" class="wallet-icon" draggable="false" />
        <!-- 已连接钱包：显示 ID -->
        <span v-if="walletStore.isConnected" class="wallet-text wallet-connected">
          ID: {{ walletStore.walletShortId }}
        </span>
        <!-- 未连接钱包：显示连接按钮 -->
        <span v-else class="wallet-text">{{ t('nav.connectWallet') }}</span>
      </div>

      <!-- Right Side - Language Selector -->
      <div class="nav-right" @click="toggleLanguageMenu">
        <img src="/static/one/3.png" alt="Globe" class="globe-icon" draggable="false" />
        <span class="language-text">{{ currentLanguageName }}</span>
        <span class="arrow-icon" :class="{ 'arrow-up': showLanguageMenu }">∨</span>
        
        <!-- Language Dropdown Menu -->
        <div v-if="showLanguageMenu" class="language-dropdown" @click.stop>
          <!-- 向上的三角形指示器 -->
          <div class="dropdown-triangle"></div>
          
          <div 
            v-for="lang in languages" 
            :key="lang.code"
            class="language-option"
            :class="{ 'active': locale === lang.code }"
            @click="selectLanguage(lang)"
          >
            <span class="lang-name">{{ lang.name }}</span>
            <i v-if="locale === lang.code" class="check-icon">✓</i>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Wallet Alert -->
  <WalletAlert v-model:visible="showWalletAlertDialog" />
</template>

<script setup>
/**
 * Navigation 导航栏组件
 * 
 * 功能：
 * - 顶部固定导航栏
 * - 钱包连接状态显示（支持 TokenPocket、MetaMask 等）
 * - 语言切换
 * - 护眼模式
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WalletAlert from './WalletAlert.vue'
import { useWalletStore } from '@/stores/wallet'
import { initWallet, connectWallet, isDAppBrowser, ensureReferralBound } from '@/utils/wallet'
import { trackWalletConnect, trackClick } from '@/utils/tracker'

const { t, locale } = useI18n()

// 钱包 store
const walletStore = useWalletStore()

const isScrolled = ref(false)
const scrollOpacity = ref(0)
const showLanguageMenu = ref(false)
const eyeCareMode = ref(false)
const showWalletAlertDialog = ref(false)

// 可选语言列表
const languages = ref([
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'id', name: 'Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'fr', name: 'Français' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zu', name: 'Iingizimu Afrika' },
  { code: 'es', name: 'España' },
  { code: 'pt', name: 'Portugal' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ms', name: 'Melayu' },
  { code: 'uk', name: 'Україна' },
  { code: 'zh-tw', name: '繁體中文' }
])

// 计算当前语言名称
const currentLanguageName = computed(() => {
  const lang = languages.value.find(l => l.code === locale.value)
  return lang ? lang.name : 'English'
})

const handleScroll = () => {
  const scrollY = window.scrollY
  
  // 当滚动距离超过50px时，认为已滚动
  isScrolled.value = scrollY > 50
  
  // 计算透明度：0-100px范围内从0渐变到1
  if (scrollY <= 100) {
    scrollOpacity.value = scrollY / 100
  } else {
    scrollOpacity.value = 1
  }
}

// 切换语言菜单显示
const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}

// 选择语言
const selectLanguage = (lang) => {
  locale.value = lang.code
  showLanguageMenu.value = false
  // 保存语言设置到localStorage
  localStorage.setItem('language', lang.code)
  console.log('Selected language:', lang.code, lang.name)
}

// 切换护眼模式
const toggleEyeCareMode = () => {
  eyeCareMode.value = !eyeCareMode.value
  // 保存设置到localStorage
  localStorage.setItem('eyeCareMode', eyeCareMode.value)
  console.log('Eye Care Mode:', eyeCareMode.value ? 'ON' : 'OFF')
}

// 注意：推荐关系绑定逻辑已统一移至 @/utils/wallet.js 中的 ensureReferralBound 函数

/**
 * 处理钱包点击事件
 * - 如果在 DApp 浏览器中：尝试连接钱包
 * - 如果不在 DApp 浏览器中：显示提示
 */
const handleWalletClick = async () => {
  // 如果已经连接，可以显示钱包详情或断开连接
  if (walletStore.isConnected) {
    console.log('[Navigation] Wallet already connected:', walletStore.walletAddress)
    // 可以在这里添加显示钱包详情的逻辑
    return
  }

  // 检查是否在 DApp 浏览器中
  if (isDAppBrowser()) {
    console.log('[Navigation] In DApp browser, attempting to connect...')
    const result = await connectWallet()
    
    if (result.success) {
      // 记录钱包连接行为
      trackWalletConnect(walletStore.walletAddress)
      // 连接成功后，自动绑定推荐关系
      await ensureReferralBound()
    } else {
      console.error('[Navigation] Connection failed:', result.error)
      // 连接失败时显示提示
      showWalletAlertDialog.value = true
    }
  } else {
    // 不在 DApp 浏览器中，显示提示
    console.log('[Navigation] Not in DApp browser, showing alert')
    showWalletAlertDialog.value = true
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event) => {
  const navRight = document.querySelector('.nav-right')
  if (navRight && !navRight.contains(event.target)) {
    showLanguageMenu.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
  
  // 从localStorage恢复护眼模式设置
  const savedEyeCareMode = localStorage.getItem('eyeCareMode')
  if (savedEyeCareMode === 'true') {
    eyeCareMode.value = true
  }

  // 初始化钱包连接
  // 在 DApp 浏览器中会自动检测并连接钱包
  try {
    await initWallet()
    console.log('[Navigation] Wallet initialized, connected:', walletStore.isConnected)
    
    // 如果钱包已连接，尝试绑定推荐关系
    if (walletStore.isConnected) {
      await ensureReferralBound()
    }
  } catch (error) {
    console.error('[Navigation] Wallet initialization error:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* 颜色变量定义 */
:root {
  --UI-BG: #fff;
  --UI-BG-1: #f7f7f7;
  --UI-BG-2: #fff;
  --UI-BG-3: #f7f7f7;
  --UI-BG-4: #4c4c4c;
  --UI-BG-5: #fff;
  --UI-FG: #000;
  --UI-FG-0: rgba(0, 0, 0, 0.9);
  --UI-FG-HALF: rgba(0, 0, 0, 0.9);
  --UI-FG-1: rgba(0, 0, 0, 0.5);
  --UI-FG-2: rgba(0, 0, 0, 0.3);
  --UI-FG-3: rgba(0, 0, 0, 0.1);
}

.navigation {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 108px;
  background-image: url('/static/two/headbgimg.png');
  background-size: 100% 100%;
  background-position: top center;
  background-repeat: no-repeat;
  background-color: transparent;
  z-index: 9972;
  display: flex;
  align-items: flex-start;
  padding: 16px 16px 0;
  transition: all 0.3s ease;
}

/* 滚动后的导航栏样式 */
.navigation.scrolled {
  height: 106px;
  background-image: none;
  align-items: center;
  padding: 0 16px;
}

.nav-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

/* Left Side */
.nav-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.logo-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logo-icon:hover {
  opacity: 0.8;
  transform: scale(1.1);
}

.logo-icon.eye-care-active {
  opacity: 0.7;
}

/* 护眼模式遮罩 - 屏幕变暗效果 */
.eye-care-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 9999;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Center */
.nav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.3s ease;
  /* 为左右区域预留更多空间，避免与长语言名称重叠 */
  max-width: calc(100% - 260px); /* 从180px增加到260px */
  padding: 4px 8px;
  box-sizing: border-box;
}

.nav-center:hover {
  opacity: 0.8;
}

.wallet-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0; /* 确保图标不会被压缩 */
}

.wallet-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  line-height: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 缩小最大宽度，为长语言名称预留空间 */
  max-width: 180px; /* 从240px减少到180px */
}

/* 已连接钱包状态样式 */
.wallet-text.wallet-connected {
  color: #f5b638; /* 金黄色，表示已连接 */
  font-weight: 600;
}

/* Right Side (Language selector) */
.nav-right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  /* 限制右侧区域最大宽度，避免挤压中间内容 */
  max-width: 200px;
}

.nav-right:hover {
  opacity: 0.9;
}

.globe-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0; /* 确保图标不会被压缩 */
}

.language-text {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  line-height: 18px;
  white-space: nowrap;
  /* 添加省略号处理，防止超长语言名称溢出 */
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px; /* 限制语言文字最大宽度 */
}

/* 下拉箭头 - PC端（空心 ∨ 符号）*/
.arrow-icon {
  display: inline-block;
  font-size: 16px;
  color: #fff;
  font-weight: 400;
  line-height: 1;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 4px;
  vertical-align: middle;
}

.arrow-icon.arrow-up {
  transform: rotate(180deg);
}

/* Language Dropdown */
.language-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 193px;
  max-height: 430px;
  background: #4F4843;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1000;
  animation: slideDown 0.2s ease;
  /* 完全隐藏滚动条 - 所有浏览器 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 和 Edge */
}

/* 按钮下方的向下三角形 - PC端 44*22 */
.nav-right::before {
  content: '';
  position: absolute;
  right: 21px;
  bottom: -22px;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-top: 22px solid rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 999;
}

/* 菜单展开时显示按钮下方的三角形 */
.nav-right:has(.language-dropdown)::before {
  opacity: 1;
}

/* 下拉菜单顶部的三角形指示器 - PC端 44*22 */
.dropdown-triangle {
  position: absolute;
  top: -22px;
  right: 21px;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-bottom: 22px solid #4F4843;
}

/* 完全隐藏滚动条 - WebKit浏览器 (Chrome, Safari, Edge) */
.language-dropdown::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
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

.language-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 193px;
  height: 88px;
  color: #f7f7f7;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: #544D47;
}

.language-option:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.language-option:last-child {
  border-bottom: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.language-option:hover {
  background: #60554D;
}

.language-option.active {
  background: #524C45;
  color: #fff;
}

.lang-name {
  text-align: center;
}

.check-icon {
  display: none;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .navigation {
    height: 108px;
    padding: 12px;
  }

  .navigation.scrolled {
    height: 80px;
    padding: 0 12px;
  }

  .wallet-text,
  .language-text {
    font-size: 13px;
  }

  .nav-center {
    /* 移动端增加预留空间，避免与长语言名称重叠 */
    max-width: calc(100% - 220px); /* 从150px增加到220px */
  }
  
  .wallet-text {
    max-width: 140px; /* 移动端进一步限制宽度 */
  }
  
  .language-text {
    max-width: 120px; /* 移动端限制语言文字宽度 */
  }
  
  .nav-right {
    max-width: 180px; /* 移动端限制右侧区域宽度 */
  }

  /* H5移动端下拉框适配 */
  .language-dropdown {
    width: 115px;
    max-height: 482px;
  }

  /* 移动端按钮下方三角形 */
  .nav-right::before {
    right: 15px;
    bottom: -15px;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 15px solid rgba(0, 0, 0, 0.3);
  }

  /* 移动端三角形指示器 */
  .dropdown-triangle {
    right: 15px;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-bottom: 15px solid #4F4843;
    top: -15px;
  }

  .language-option {
    width: 115px;
    height: 55px;
    font-size: 13px;
  }

  /* 手机端下拉箭头（空心 ∨ 符号）*/
  .arrow-icon {
    font-size: 14px;
    margin-left: 3px;
  }
}

@media (max-width: 480px) {
  .navigation {
    height: 90px;
    padding: 10px;
  }

  .navigation.scrolled {
    height: 70px;
    padding: 0 10px;
  }

  .logo-icon {
    width: 20px;
    height: 20px;
  }

  .wallet-icon,
  .globe-icon {
    width: 14px;
    height: 14px;
  }

  .wallet-text,
  .language-text {
    font-size: 12px;
  }

  .nav-center {
    /* 小屏手机增加预留空间 */
    max-width: calc(100% - 200px); /* 从130px增加到200px */
  }
  
  .wallet-text {
    max-width: 120px; /* 小屏进一步限制 */
  }
  
  .language-text {
    max-width: 100px; /* 小屏限制语言文字 */
  }
  
  .nav-right {
    max-width: 160px; /* 小屏限制右侧区域 */
  }

  /* 小屏H5下拉框适配 */
  .language-dropdown {
    width: 115px;
    max-height: 482px;
  }

  /* 小屏按钮下方三角形 */
  .nav-right::before {
    right: 12px;
    bottom: -12px;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid rgba(0, 0, 0, 0.3);
  }

  /* 小屏三角形指示器 */
  .dropdown-triangle {
    right: 12px;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid #4F4843;
    top: -12px;
  }

  .language-option {
    width: 115px;
    height: 55px;
    font-size: 13px;
  }

  /* 超小屏下拉箭头（空心 ∨ 符号）*/
  .arrow-icon {
    font-size: 13px;
    margin-left: 3px;
  }
}

/* 小屏H5适配 */
@media (max-width: 375px) {
  .navigation {
    height: 80px;
    padding: 8px;
  }

  .navigation.scrolled {
    height: 60px;
    padding: 0 8px;
  }

  .logo-icon {
    width: 18px;
    height: 18px;
  }

  .wallet-icon,
  .globe-icon {
    width: 12px;
    height: 12px;
  }

  .nav-center {
    gap: 6px;
  }

  .nav-right {
    gap: 6px;
  }

  .wallet-text,
  .language-text {
    font-size: 11px;
  }

  .nav-center {
    /* 超小屏增加预留空间 */
    max-width: calc(100% - 180px); /* 从120px增加到180px */
  }
  
  .wallet-text {
    max-width: 100px; /* 超小屏严格限制 */
  }
  
  .language-text {
    max-width: 85px; /* 超小屏严格限制语言文字 */
  }
  
  .nav-right {
    max-width: 140px; /* 超小屏限制右侧区域 */
  }

  /* 超小屏H5下拉框适配 */
  .language-dropdown {
    width: 115px;
    max-height: 482px;
  }

  /* 超小屏按钮下方三角形 */
  .nav-right::before {
    right: 10px;
    bottom: -10px;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid rgba(0, 0, 0, 0.3);
  }

  /* 超小屏三角形指示器 */
  .dropdown-triangle {
    right: 10px;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid #4F4843;
    top: -10px;
  }

  .language-option {
    width: 115px;
    height: 55px;
    font-size: 12px;
  }

  /* 375px屏幕下拉箭头（空心 ∨ 符号）*/
  .arrow-icon {
    font-size: 12px;
    margin-left: 2px;
  }
}
</style>
