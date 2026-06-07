import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: []
      }
    }),
  ],
  
  base: process.env.VITE_APP_BASE || (process.env.GITHUB_ACTIONS ? '/mindnotes-pro/' : '/'),
  
  server: {
    port: 3000,
    open: true,
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, '/')

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/') ||
            normalizedId.includes('/node_modules/use-sync-external-store/')
          ) {
            return 'vendor-react'
          }

          // jspdf is dynamically imported — let Vite create an async chunk for it
          if (normalizedId.includes('/node_modules/jspdf')) {
            return
          }

          if (normalizedId.includes('/node_modules/')) {
            return 'vendor'
          }
        },
        
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
    
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    exclude: ['@vite/client', '@vite/env']
  }
})
