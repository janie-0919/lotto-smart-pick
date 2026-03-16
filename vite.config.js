import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

let _cookie = ''
let _cookieExpiry = 0

async function getDhlotteryCookie() {
  if (_cookie && Date.now() < _cookieExpiry) return _cookie
  try {
    const res = await fetch('https://www.dhlottery.co.kr/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
      redirect: 'follow',
    })
    const rawCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : (res.headers.get('set-cookie') || '').split(/,(?=[^ ])/)
    _cookie = rawCookies.map((c) => c.split(';')[0]).join('; ')
    _cookieExpiry = Date.now() + 30 * 60 * 1000
  } catch (e) {
    console.warn('[lotto-proxy] 쿠키 수집 실패:', e.message)
  }
  return _cookie
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lotto-proxy',
      configureServer(server) {
        server.middlewares.use('/api/lotto', async (req, res) => {
          const qs = req.url.includes('?') ? req.url.split('?')[1] : ''
          const params = new URLSearchParams(qs)
          const method = params.get('method')
          const drwNo = params.get('drwNo')

          if (!method || !drwNo) {
            res.statusCode = 400
            res.end('{}')
            return
          }

          try {
            const cookie = await getDhlotteryCookie()
            const apiRes = await fetch(
              `https://www.dhlottery.co.kr/common.do?method=${method}&drwNo=${drwNo}`,
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  Referer: 'https://www.dhlottery.co.kr/',
                  Cookie: cookie,
                  'X-Requested-With': 'XMLHttpRequest',
                  Accept: 'application/json, text/javascript, */*; q=0.01',
                  'Accept-Language': 'ko-KR,ko;q=0.9',
                },
                redirect: 'follow',
              }
            )
            const text = await apiRes.text()
            try {
              JSON.parse(text)
            } catch {
              // Got non-JSON (likely HTML redirect) — invalidate cookie and return fail
              _cookie = ''
              _cookieExpiry = 0
              res.statusCode = 502
              res.end(JSON.stringify({ returnValue: 'fail' }))
              return
            }
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(text)
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ returnValue: 'fail', error: err.message }))
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
