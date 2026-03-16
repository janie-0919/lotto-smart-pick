/**
 * 동행복권 API 연동
 * 1차: Vercel Serverless(/api/lotto) 또는 Vite 프록시
 * 폴백: allorigins.win CORS 우회 프록시
 */

const CACHE_KEY = 'lotto_cache'
const CACHE_EXPIRY = 1000 * 60 * 60 * 6 // 6시간
const DHLOTTERY_BASE = 'https://www.dhlottery.co.kr/common.do'

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
const parseDrawData = (data) => {
  if (!data || data.returnValue !== 'success') return null
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

// 1차: 내부 프록시 (/api/lotto → Vercel Function or Vite proxy)
const fetchViaProxy = async (round) => {
  const res = await fetch(`/api/lotto?method=getLottoNumber&drwNo=${round}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const parsed = parseDrawData(data)
  if (!parsed) throw new Error('returnValue != success')
  return parsed
}

// 폴백: allorigins.win CORS 우회
const fetchViaAllOrigins = async (round) => {
  const target = encodeURIComponent(
    `${DHLOTTERY_BASE}?method=getLottoNumber&drwNo=${round}`
  )
  const res = await fetch(`https://api.allorigins.win/get?url=${target}`)
  if (!res.ok) throw new Error(`allorigins HTTP ${res.status}`)
  const wrapper = await res.json()
  const data = JSON.parse(wrapper.contents)
  const parsed = parseDrawData(data)
  if (!parsed) throw new Error('returnValue != success')
  return parsed
}

// 단일 회차 조회 (프록시 → allorigins 순서)
export const fetchLottoRound = async (round) => {
  try {
    return await fetchViaProxy(round)
  } catch {
    return await fetchViaAllOrigins(round)
  }
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
