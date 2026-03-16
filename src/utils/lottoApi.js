/**
 * 동행복권 API 연동
 * CORS 문제로 인해 Vercel Serverless Function을 통해 프록시
 */

const CACHE_KEY = 'lotto_cache'
const CACHE_EXPIRY = 1000 * 60 * 60 * 6 // 6시간

const getCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_EXPIRY) return null
    return data
  } catch {
    return null
  }
}

const setCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {}
}

// 최신 회차 번호 추정 (2002년 12월 7일 1회차 기준)
export const estimateLatestRound = () => {
  const firstDraw = new Date('2002-12-07')
  const now = new Date()
  const weeks = Math.floor((now - firstDraw) / (7 * 24 * 60 * 60 * 1000))
  return weeks + 1
}

// 단일 회차 데이터 조회
export const fetchLottoRound = async (round) => {
  const res = await fetch(`/api/lotto?method=getLottoNumber&drwNo=${round}`)
  if (!res.ok) throw new Error('API 오류')
  const data = await res.json()
  if (data.returnValue !== 'success') throw new Error('데이터 없음')

  return {
    round: data.drwNo,
    date: data.drwNoDate,
    numbers: [
      data.drwtNo1,
      data.drwtNo2,
      data.drwtNo3,
      data.drwtNo4,
      data.drwtNo5,
      data.drwtNo6,
    ],
    bonus: data.bnusNo,
    firstPrize: data.firstWinamnt,
    firstWinnerCount: data.firstPrzwnerCo,
  }
}

// 최근 N회차 데이터 조회 (캐싱 포함)
export const fetchRecentRounds = async (count = 50) => {
  const cached = getCache()
  if (cached && cached.length >= count) return cached.slice(0, count)

  const latest = estimateLatestRound()
  const results = []

  // 병렬 요청 (최대 10개씩)
  for (let i = 0; i < count; i += 10) {
    const batch = Array.from(
      { length: Math.min(10, count - i) },
      (_, j) => latest - i - j
    ).filter((r) => r > 0)

    try {
      const batchResults = await Promise.allSettled(batch.map(fetchLottoRound))
      batchResults.forEach((res) => {
        if (res.status === 'fulfilled') results.push(res.value)
      })
    } catch {
      // 배치 실패시 스킵
    }
  }

  results.sort((a, b) => b.round - a.round)
  if (results.length > 0) setCache(results)
  return results
}

// 번호별 빈도 통계 계산
export const calculateFrequency = (draws) => {
  const freq = {}
  for (let i = 1; i <= 45; i++) freq[i] = 0

  draws.forEach((draw) => {
    draw.numbers?.forEach((n) => {
      if (freq[n] !== undefined) freq[n]++
    })
  })

  return freq
}

// Hot/Cold 번호 계산 (최근 10회 기준)
export const calculateHotCold = (draws, topN = 10) => {
  const freq = calculateFrequency(draws.slice(0, 20))
  const entries = Object.entries(freq)
    .map(([num, count]) => ({ num: parseInt(num), count }))
    .sort((a, b) => b.count - a.count)

  return {
    hot: entries.slice(0, topN).map((e) => e.num),
    cold: entries.slice(-topN).map((e) => e.num),
  }
}
