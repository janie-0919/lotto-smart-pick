/**
 * Vercel Serverless Function
 * 동행복권 API CORS 우회 프록시
 * 경로: /api/lotto?drwNo={회차}
 */
export default async function handler(req, res) {
  const { drwNo } = req.query

  if (!drwNo) {
    return res.status(400).json({ error: 'drwNo is required' })
  }

  const url = `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=${drwNo}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    const data = await response.json()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Lotto API proxy error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
