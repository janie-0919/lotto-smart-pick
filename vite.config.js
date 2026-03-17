import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lotto-proxy',
      configureServer(server) {
        server.middlewares.use('/api/lotto', async (req, res) => {
          const qs = req.url.includes('?') ? req.url.split('?')[1] : ''
          const params = new URLSearchParams(qs)
          const drwNo = params.get('drwNo')
          if (!drwNo) {
            res.statusCode = 400
            res.end('{}')
            return
          }
          try {
            const apiRes = await fetch(
              `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=${drwNo}`
            )
            const text = await apiRes.text()
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(text)
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      },
    },
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    target: 'es2019',
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
})
