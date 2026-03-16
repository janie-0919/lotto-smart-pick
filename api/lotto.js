/**
 * Vercel Serverless Function
 * 동행복권 API CORS 우회 프록시
 * 경로: /api/lotto
 */

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

export default async function handler(req, res) {
  const { method, drwNo } = req.query

  if (!method || !drwNo) {
    return res.status(400).json({ error: 'method and drwNo are required' })
  }

  const url = `https://www.dhlottery.co.kr/common.do?method=${method}&drwNo=${drwNo}`

  try {
    const cookie = await getDhlotteryCookie()
    const response = await fetch(url, {
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
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      // Got non-JSON (likely HTML) — invalidate cached cookie
      _cookie = ''
      _cookieExpiry = 0
      return res.status(502).json({ returnValue: 'fail', error: 'Non-JSON response from upstream' })
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Lotto API proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
