/**
 * 主题状态管理
 * 支持亮色/暗黑主题切换
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 当前主题：'light' 或 'dark'
  const theme = ref(localStorage.getItem('admin_theme') || 'dark')
  
  // 侧边栏折叠状态
  const sidebarCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')
  
  /**
   * 切换主题
   */
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    applyTheme()
  }
  
  /**
   * 设置主题
   */
  const setTheme = (newTheme) => {
    theme.value = newTheme
    applyTheme()
  }
  
  /**
   * 应用主题到DOM
   */
  const applyTheme = () => {
    const html = document.documentElement
    
    if (theme.value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    
    // 持久化
    localStorage.setItem('admin_theme', theme.value)
  }
  
  /**
   * 切换侧边栏
   */
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed.value)
  }
  
  /**
   * 初始化主题
   */
  const initTheme = () => {
    // 检查系统主题偏好
    if (!localStorage.getItem('admin_theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'dark' // 默认暗黑主题
    }
    applyTheme()
  }
  
  return {
    theme,
    sidebarCollapsed,
    toggleTheme,
    setTheme,
    applyTheme,
    toggleSidebar,
    initTheme
  }
})

