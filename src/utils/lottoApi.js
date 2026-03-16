/**
 * 동행복권 API 연동
 * 경로: /api/lotto?drwNo={회차}
 * → Vite 커스텀 프록시 미들웨어 (개발) / Vercel Serverless (프로덕션)
 * → 실제 호출: https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd={회차}
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

// 응답 데이터를 내부 형식으로 변환
const parseDrawData = (raw) => {
  const item = raw?.data?.list?.[0]
  if (!item) return null
  const d = item.ltRflYmd // "20260207"
  const date = d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : ''
  return {
    round: item.ltEpsd,
    date,
    numbers: [item.tm1WnNo, item.tm2WnNo, item.tm3WnNo, item.tm4WnNo, item.tm5WnNo, item.tm6WnNo],
    bonus: item.bnsWnNo,
    firstPrize: item.rnk1WnAmt,
    firstWinnerCount: item.rnk1WnNope,
  }
}

// 단일 회차 조회 (내부 프록시 경유)
export const fetchLottoRound = async (round) => {
  const res = await fetch(`/api/lotto?drwNo=${round}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const parsed = parseDrawData(data)
  if (!parsed) throw new Error('데이터 없음')
  return parsed
}

// 최근 N회차 데이터 조회 (캐싱 포함)
export const fetchRecentRounds = async (count = 50) => {
  const cached = getCache()
  if (cached && cached.length >= count) return cached.slice(0, count)

  const latest = estimateLatestRound()
  const results = []

  // 병렬 요청 (최대 5개씩 - 요청 과부하 방지)
  for (let i = 0; i < count; i += 5) {
    const batch = Array.from(
      { length: Math.min(5, count - i) },
      (_, j) => latest - i - j
    ).filter((r) => r > 0)

    const batchResults = await Promise.allSettled(batch.map(fetchLottoRound))
    batchResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) results.push(res.value)
    })
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

// Hot/Cold 번호 계산 (최근 20회 기준)
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
