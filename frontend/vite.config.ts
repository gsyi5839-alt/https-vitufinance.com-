import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    strictPort: false,
    open: false
  },
  build: {
    // 输出到dist目录
    outDir: 'dist',
    // 启用CSS代码分割 - 提高首屏加载速度
    cssCodeSplit: true,
    // 代码分割优化 - 减少首屏加载
    rollupOptions: {
      output: {
        // 手动配置代码分割
        manualChunks(id) {
          // vendor chunk - 第三方库
          if (id.includes('node_modules')) {
            // Element Plus 单独分包
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            // Vue 相关库单独分包
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            // i18n 单独分包
            if (id.includes('vue-i18n') || id.includes('@intlify')) {
              return 'i18n'
            }
            // 其他第三方库
            return 'vendor'
          }
          // 组件按功能分包
          if (id.includes('/src/components/')) {
            return 'components'
          }
          // 视图按路由分包 - 按需加载
          if (id.includes('/src/views/')) {
            return 'views'
          }
        },
        // 确保文件名一致性
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 临时保留console用于调试签名弹窗问题
        drop_debugger: true
      }
    },
    // chunk 大小警告限制
    chunkSizeWarningLimit: 500,
    // 静态资源处理
    assetsInlineLimit: 4096, // 小于4kb的图片转base64
    // 资源预加载优化 - 提高移动端性能
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // 过滤掉非首屏必需的依赖，减少预加载
        return deps.filter(dep => {
          // 首屏必需：vue核心、组件、i18n
          if (dep.includes('vue-vendor') || 
              dep.includes('components') || 
              dep.includes('i18n')) {
            return true
          }
          // 非首屏：element-plus、views按需加载
          return false
        })
      }
    }
  },
  // CSS配置
  css: {
    devSourcemap: false
  }
})
