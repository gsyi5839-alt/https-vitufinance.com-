import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',  // 设置基础路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // CloudFlare CDN 优化配置
    rollupOptions: {
      output: {
        // 为静态资源生成带hash的文件名，利用CDN长期缓存
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // 代码分割优化
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Element Plus 单独分包
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            // Vue 生态单独分包
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            // ECharts 单独分包（较大）
            if (id.includes('echarts')) {
              return 'echarts'
            }
            // Three.js 单独分包（较大）
            if (id.includes('three')) {
              return 'three'
            }
            // 其他第三方库
            return 'vendor'
          }
        }
      }
    },
    // 代码压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 静态资源内联限制
    assetsInlineLimit: 4096
  }
})

