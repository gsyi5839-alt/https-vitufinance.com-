/// <reference types="vite/client" />

/**
 * Vue 单文件组件类型定义
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

