/**
 * 로또 번호 생성 유틸리티
 * 완전랜덤 / 통계기반 / 균형형 3가지 모드 지원
 */

// 번호 색상 (공식 로또 색상)
export const getBallColor = (num) => {
  if (num <= 10) return 'yellow'
  if (num <= 20) return 'blue'
  if (num <= 30) return 'red'
  if (num <= 40) return 'gray'
  return 'green'
}

// 배열 섞기 (Fisher-Yates)
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 가중치 기반 랜덤 선택
const weightedRandom = (numbers, weights) => {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < numbers.length; i++) {
    r -= weights[i]
    if (r <= 0) return numbers[i]
  }
  return numbers[numbers.length - 1]
}

// 조건 검증
const validateNumbers = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b)

  // 홀짝 비율 (2:4 ~ 4:2)
  const oddCount = sorted.filter((n) => n % 2 !== 0).length
  if (oddCount < 2 || oddCount > 4) return false

  // 합계 범위 100~175
  const sum = sorted.reduce((a, b) => a + b, 0)
  if (sum < 100 || sum > 175) return false

  // 구간 분포 검사 (한 구간에 3개 이상 몰리면 안됨)
  const sections = [0, 0, 0, 0, 0]
  sorted.forEach((n) => {
    if (n <= 10) sections[0]++
    else if (n <= 20) sections[1]++
    else if (n <= 30) sections[2]++
    else if (n <= 40) sections[3]++
    else sections[4]++
  })
  if (Math.max(...sections) >= 4) return false

  // 연속번호 2쌍 이하
  let consecutivePairs = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 1) consecutivePairs++
  }
  if (consecutivePairs > 2) return false

  // 끝수 과도 중복 방지 (같은 끝수 3개 이상)
  const endDigits = sorted.map((n) => n % 10)
  const endDigitCounts = {}
  endDigits.forEach((d) => {
    endDigitCounts[d] = (endDigitCounts[d] || 0) + 1
  })
  if (Math.max(...Object.values(endDigitCounts)) >= 3) return false

  return true
}

/**
 * 완전 랜덤 생성
 */
export const generateRandom = (excludeNums = [], includeNums = []) => {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter(
    (n) => !excludeNums.includes(n)
  )

  // 포함 번호 먼저 확정 (최대 6개)
  const fixed = includeNums.filter((n) => !excludeNums.includes(n)).slice(0, 5)
  const remaining = pool.filter((n) => !fixed.includes(n))

  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = shuffle(remaining)
    const picked = [...fixed, ...shuffled.slice(0, 6 - fixed.length)]
    if (picked.length === 6 && validateNumbers(picked)) {
      return picked.sort((a, b) => a - b)
    }
  }

  // 조건 미충족시 그냥 반환
  const shuffled = shuffle(remaining)
  return [...fixed, ...shuffled.slice(0, 6 - fixed.length)].sort((a, b) => a - b)
}

/**
 * 통계 기반 생성 (최근 당첨 이력 반영)
 */
export const generateStatsBased = (
  recentWinningNumbers = [],
  excludeNums = [],
  includeNums = []
) => {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter(
    (n) => !excludeNums.includes(n)
  )

  // 최근 50회 출현 빈도 계산
  const frequency = {}
  pool.forEach((n) => (frequency[n] = 0))

  const recent50 = recentWinningNumbers.slice(0, 50)
  recent50.forEach((draw) => {
    draw.numbers?.forEach((n) => {
      if (frequency[n] !== undefined) frequency[n]++
    })
  })

  // 최근 10회 미출현 번호
  const recent10Nums = new Set()
  recentWinningNumbers.slice(0, 10).forEach((draw) => {
    draw.numbers?.forEach((n) => recent10Nums.add(n))
  })

  // 가중치 계산
  const weights = pool.map((n) => {
    let w = 10
    const freq = frequency[n]

    // 최근 50회 빈도 반영
    if (freq >= 8) w += 5
    else if (freq >= 5) w += 3
    else if (freq <= 1) w += 2 // 저빈도 소폭 가산

    // 최근 10회 미출현 가산점
    if (!recent10Nums.has(n)) w += 4

    // 너무 과열된 번호 감점
    if (freq >= 12) w -= 4

    return Math.max(w, 1)
  })

  const fixed = includeNums.filter((n) => !excludeNums.includes(n)).slice(0, 5)
  const remaining = pool.filter((n) => !fixed.includes(n))
  const remainingWeights = remaining.map((n) => weights[pool.indexOf(n)])

  for (let attempt = 0; attempt < 2000; attempt++) {
    const picked = [...fixed]
    const availableNums = [...remaining]
    const availableWeights = [...remainingWeights]

    while (picked.length < 6) {
      if (availableNums.length === 0) break
      const idx = availableNums.findIndex(
        (n) =>
          n ===
          weightedRandom(
            availableNums,
            availableWeights.slice(0, availableNums.length)
          )
      )
      if (idx === -1) break
      picked.push(availableNums[idx])
      availableNums.splice(idx, 1)
      availableWeights.splice(idx, 1)
    }

    if (picked.length === 6 && validateNumbers(picked)) {
      return picked.sort((a, b) => a - b)
    }
  }

  return generateRandom(excludeNums, includeNums)
}

/**
 * 균형형 생성 (구간 분산 보장)
 */
export const generateBalanced = (excludeNums = [], includeNums = []) => {
  const sections = [
    Array.from({ length: 10 }, (_, i) => i + 1),
    Array.from({ length: 10 }, (_, i) => i + 11),
    Array.from({ length: 10 }, (_, i) => i + 21),
    Array.from({ length: 10 }, (_, i) => i + 31),
    Array.from({ length: 5 }, (_, i) => i + 41),
  ].map((sec) => sec.filter((n) => !excludeNums.includes(n)))

  const fixed = includeNums.filter((n) => !excludeNums.includes(n)).slice(0, 5)

  for (let attempt = 0; attempt < 2000; attempt++) {
    const picked = [...fixed]

    // 구간별 분배 전략: 최소 각 구간에서 1개 이상
    const sectionPicks = [0, 0, 0, 0, 0]

    // 이미 포함된 번호의 구간 표시
    fixed.forEach((n) => {
      if (n <= 10) sectionPicks[0]++
      else if (n <= 20) sectionPicks[1]++
      else if (n <= 30) sectionPicks[2]++
      else if (n <= 40) sectionPicks[3]++
      else sectionPicks[4]++
    })

    // 빈 구간에서 우선 선택
    for (let s = 0; s < 5 && picked.length < 6; s++) {
      if (sectionPicks[s] === 0 && sections[s].length > 0) {
        const available = sections[s].filter((n) => !picked.includes(n))
        if (available.length > 0) {
          picked.push(available[Math.floor(Math.random() * available.length)])
          sectionPicks[s]++
        }
      }
    }

    // 나머지 랜덤 보충
    const allAvailable = Array.from({ length: 45 }, (_, i) => i + 1).filter(
      (n) => !excludeNums.includes(n) && !picked.includes(n)
    )
    while (picked.length < 6 && allAvailable.length > 0) {
      const idx = Math.floor(Math.random() * allAvailable.length)
      picked.push(allAvailable[idx])
      allAvailable.splice(idx, 1)
    }

    if (picked.length === 6 && validateNumbers(picked)) {
      return picked.sort((a, b) => a - b)
    }
  }

  return generateRandom(excludeNums, includeNums)
}

/**
 * 모드에 따라 번호 생성 (5세트)
 */
export const generateSets = (mode, recentData, excludeNums, includeNums, count = 5) => {
  const results = []
  for (let i = 0; i < count; i++) {
    let nums
    if (mode === 'random') {
      nums = generateRandom(excludeNums, includeNums)
    } else if (mode === 'stats') {
      nums = generateStatsBased(recentData, excludeNums, includeNums)
    } else {
      nums = generateBalanced(excludeNums, includeNums)
    }
    results.push(nums)
  }
  return results
}

/**
 * 번호 세트 분석 정보 계산
 */
export const analyzeNumbers = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const oddCount = sorted.filter((n) => n % 2 !== 0).length
  const evenCount = 6 - oddCount

  const sections = [0, 0, 0, 0, 0]
  sorted.forEach((n) => {
    if (n <= 10) sections[0]++
    else if (n <= 20) sections[1]++
    else if (n <= 30) sections[2]++
    else if (n <= 40) sections[3]++
    else sections[4]++
  })

  let consecutivePairs = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 1) consecutivePairs++
  }

  return { sum, oddCount, evenCount, sections, consecutivePairs }
}
