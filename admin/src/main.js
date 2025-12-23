/**
 * VituFinance Admin System Entry Point
 * 
 * Features:
 * - Vue 3 with Pinia state management
 * - Element Plus UI with dark theme support
 * - Safari/iOS performance optimizations
 * - Global error handling and logging
 * - CSRF protection
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// Element Plus styles
import 'element-plus/dist/index.css'
// Element Plus dark theme
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import './styles/index.scss'
// Safari/iOS performance optimizations
import './styles/safari-optimizations.scss'

// Device detection and optimization
import { applyDeviceOptimizations } from './utils/deviceDetect'

// Error logging
import { 
  createVueErrorHandler, 
  setupGlobalErrorHandlers,
  syncPendingErrors 
} from './utils/errorLogger'

// Apply device optimizations before DOM loads
applyDeviceOptimizations()

// Create application instance
const app = createApp(App)

// Create Pinia instance
const pinia = createPinia()

// Initialize global error handlers
setupGlobalErrorHandlers()

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Use plugins
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
  size: 'default'
})
app.use(createVueErrorHandler()) // Vue error handler

// Initialize theme
import { useThemeStore } from './stores/theme'
const themeStore = useThemeStore()
themeStore.initTheme()

// ==================== CSRF Protection Initialization ====================
// Initialize CSRF token (used automatically by API interceptor)
import { useCsrfStore } from './stores/csrf'
const csrfStore = useCsrfStore()
csrfStore.fetchCsrfToken().then(() => {
  console.log('[Admin] CSRF token initialized')
}).catch((error) => {
  console.error('[Admin] Failed to initialize CSRF token:', error)
  // Continue mounting app, CSRF interceptor will fetch token on request
})

// Mount application
app.mount('#app')

// Sync pending errors when online
window.addEventListener('online', () => {
  console.log('[Admin] Back online, syncing pending errors...')
  syncPendingErrors()
})

// Log admin startup
console.log('[Admin] VituFinance Admin System initialized successfully')
