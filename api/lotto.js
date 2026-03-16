/**
 * Vercel Serverless Function
 * 동행복권 API CORS 우회 프록시
 * 경로: /api/lotto
 */
export default async function handler(req, res) {
  const { method, drwNo } = req.query

  if (!method || !drwNo) {
    return res.status(400).json({ error: 'method and drwNo are required' })
  }

  const url = `https://www.dhlottery.co.kr/common.do?method=${method}&drwNo=${drwNo}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LottoSmartPick/1.0)',
        Referer: 'https://www.dhlottery.co.kr',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    const data = await response.json()

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

    return res.status(200).json(data)
  } catch (err) {
    console.error('Lotto API proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
