import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react({
      // 启用 React Compiler 级别的优化
      babel: {
        plugins: []
      }
    }),
    // 可视化束大小（开发工具）
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  
  // Default to root path for local/desktop builds, and repo path in GitHub Actions.
  base: process.env.VITE_APP_BASE || (process.env.GITHUB_ACTIONS ? '/mindnotes-pro/' : '/'),
  
  server: {
    port: 3000,
    open: true,
    // 启用 HTTP/2 服务推送
    middlewareMode: false
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    
    // 增强的 source map（仅限开发）
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    
    // 优化输出
    rollupOptions: {
      output: {
        // 智能代码分割
        manualChunks: (id) => {
          // 核心框架
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand')) {
            return 'vendor-core'
          }
          // UI 库
          if (id.includes('node_modules/')) {
            return 'vendor-other'
          }
          // 功能模块分离
          if (id.includes('src/store/')) {
            return 'store'
          }
          if (id.includes('src/hooks/')) {
            return 'hooks'
          }
          if (id.includes('src/components/')) {
            return 'components'
          }
          if (id.includes('src/utils/')) {
            return 'utils'
          }
        },
        
        // 优化文件输出
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `images/[name].[hash][extname]`
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name].[hash][extname]`
          } else if (ext === 'css') {
            return `css/[name].[hash][extname]`
          }
          return `assets/[name].[hash][extname]`
        }
      }
    },
    
    // 块大小警告阈值
    chunkSizeWarningLimit: 1000,
    
    // 报告压缩大小
    reportCompressedSize: true
  },
  
  optimizeDeps: {
    // 预构建依赖，提升构建速度
    include: ['react', 'react-dom', 'zustand'],
    // 排除不需要的依赖
    exclude: ['@vite/client', '@vite/env']
  }
})
