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
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.dhlottery.co.kr/',
        },
        rewrite: (path) => path.replace(/^\/api\/lotto/, '/common.do'),
      },
    },
  },
})
