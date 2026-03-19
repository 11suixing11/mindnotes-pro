import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          
          // tldraw 相关
          'tldraw': ['@tldraw/tldraw'],
          'tldraw-core': ['@tldraw/editor', '@tldraw/store'],
          
          // 工具库
          'utils': ['perfect-freehand', 'zustand', 'nanoid'],
          
          // 导出相关（懒加载）
          'export': ['file-saver', 'jspdf'],
          
          // 画布渲染
          'canvas': ['html2canvas'],
          
          // UI 组件
          'ui': ['@uiw/react-color', 'react-hotkeys-hook'],
          
          // 存储
          'storage': ['localforage'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tldraw/tldraw'],
  },
})
