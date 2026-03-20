import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mindnotes-pro/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 核心
          if (id.includes('react/') || id.includes('react-dom/')) {
            return 'react-vendor'
          }
          // framer-motion 单独拆（只在懒加载组件中使用）
          if (id.includes('framer-motion')) {
            return 'framer-motion'
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
