import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'
import './styles/mobile.css' // 引入移动端适配样式
import i18n from './locales' // 引入i18n配置
import { initPerformanceMonitoring } from './utils/performance' // 性能监控

// 过滤浏览器扩展程序的错误信息
const originalConsoleError = console.error
console.error = (...args) => {
  // 过滤 chrome-extension 相关的错误
  const errorString = args.join(' ')
  if (errorString.includes('chrome-extension://') || 
      errorString.includes('ERR_FILE_NOT_FOUND')) {
    return // 忽略浏览器扩展错误
  }
  originalConsoleError.apply(console, args)
}

const app = createApp(App)
const pinia = createPinia()

// 初始化性能监控（仅开发环境）
initPerformanceMonitoring({
  enableConsoleLog: import.meta.env.DEV,
  enableAnalytics: false, // 禁用后端上报
  apiEndpoint: '/api/analytics/performance'
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(i18n)

app.mount('#app')

