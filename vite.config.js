import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          store: ['zustand'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/lotto': {
        target: 'https://www.dhlottery.co.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lotto/, '/common.do'),
      },
    },
  },
})
