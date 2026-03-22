import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Default to root path for local/desktop builds, and repo path in GitHub Actions.
  base: process.env.VITE_APP_BASE || (process.env.GITHUB_ACTIONS ? '/mindnotes-pro/' : '/'),
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
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
