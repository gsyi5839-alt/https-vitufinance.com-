/**
 * VituFinance 后台管理系统入口文件
 * 支持暗黑主题、Element Plus组件库
 * 包含Safari/iOS性能优化
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// Element Plus 样式
import 'element-plus/dist/index.css'
// Element Plus 暗黑主题
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import './styles/index.scss'
// Safari/iOS 性能优化样式
import './styles/safari-optimizations.scss'

// 设备检测和优化
import { applyDeviceOptimizations } from './utils/deviceDetect'

// 在DOM加载前应用设备优化类
applyDeviceOptimizations()

// 创建应用实例
const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
  size: 'default'
})

// 初始化主题
import { useThemeStore } from './stores/theme'
const themeStore = useThemeStore()
themeStore.initTheme()

// ==================== CSRF防护初始化 ====================
// 初始化CSRF令牌（由 API 拦截器自动使用）
import { useCsrfStore } from './stores/csrf'
const csrfStore = useCsrfStore()
csrfStore.fetchCsrfToken().then(() => {
  console.log('[Admin] CSRF token initialized')
}).catch((error) => {
  console.error('[Admin] Failed to initialize CSRF token:', error)
  // 继续挂载应用，CSRF 拦截器会在请求时自动获取令牌
})

// 挂载应用
app.mount('#app')

