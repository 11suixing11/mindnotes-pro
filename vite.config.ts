import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [],
      },
    }),
    mode === 'analyze' &&
      visualizer({
        open: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

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

          // jspdf and all its transitive dependencies are dynamically imported
          // Route them together so they form a single async chunk
          if (
            normalizedId.includes('/node_modules/jspdf') ||
            normalizedId.includes('/node_modules/canvg') ||
            normalizedId.includes('/node_modules/fflate') ||
            normalizedId.includes('/node_modules/fast-png') ||
            normalizedId.includes('/node_modules/svg-pathdata') ||
            normalizedId.includes('/node_modules/rgbcolor') ||
            normalizedId.includes('/node_modules/stackblur-canvas') ||
            normalizedId.includes('/node_modules/core-js') ||
            normalizedId.includes('/node_modules/@babel/runtime') ||
            normalizedId.includes('/node_modules/dompurify') ||
            normalizedId.includes('/node_modules/html2canvas')
          ) {
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
        },
      },
    },

    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    exclude: ['@vite/client', '@vite/env'],
  },
}))
