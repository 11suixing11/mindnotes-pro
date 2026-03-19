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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['perfect-freehand', 'zustand'],
          export: ['file-saver', 'jspdf'],
          canvas: ['html2canvas'],
        },
      },
    },
  },
})
