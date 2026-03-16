import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import useLottoStore from '../store/useLottoStore'
import LottoBall from '../components/LottoBall'
import { calculateFrequency, calculateHotCold } from '../utils/lottoApi'
import { getBallColor } from '../utils/lottoGenerator'
import './StatisticsPage.scss'

const BALL_COLORS = {
  yellow: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  gray: '#6b7280',
  green: '#10b981',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{label}번</span>
      <span className="chart-tooltip__value">{payload[0].value}회</span>
    </div>
  )
}

export default function StatisticsPage() {
  const { recentDraws, isLoadingDraws, drawsError, loadRecentDraws } = useLottoStore()
  const [range, setRange] = useState(50)

  useEffect(() => {
    loadRecentDraws()
  }, [loadRecentDraws])

  const handleRetry = () => {
    // 캐시 초기화 후 재시도
    localStorage.removeItem('lotto_cache')
    useLottoStore.setState({ lastFetchTime: null, drawsError: null })
    loadRecentDraws()
  }

  const targetDraws = useMemo(() => recentDraws.slice(0, range), [recentDraws, range])

  const frequency = useMemo(() => calculateFrequency(targetDraws), [targetDraws])

  const freqData = useMemo(() =>
    Array.from({ length: 45 }, (_, i) => ({
      num: i + 1,
      count: frequency[i + 1] || 0,
      color: BALL_COLORS[getBallColor(i + 1)],
    })), [frequency])

  const { hot, cold } = useMemo(() => calculateHotCold(targetDraws, 10), [targetDraws])

  // 홀짝 분포
  const oddEvenData = useMemo(() => {
    let oddTotal = 0, evenTotal = 0
    targetDraws.forEach((d) => {
      d.numbers?.forEach((n) => {
        if (n % 2 !== 0) oddTotal++
        else evenTotal++
      })
    })
    return [
      { name: '홀수', value: oddTotal, fill: '#f59e0b' },
      { name: '짝수', value: evenTotal, fill: '#3b82f6' },
    ]
  }, [targetDraws])

  // 구간 분포
  const sectionData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    targetDraws.forEach((d) => {
      d.numbers?.forEach((n) => {
        if (n <= 10) counts[0]++
        else if (n <= 20) counts[1]++
        else if (n <= 30) counts[2]++
        else if (n <= 40) counts[3]++
        else counts[4]++
      })
    })
    const labels = ['1~10', '11~20', '21~30', '31~40', '41~45']
    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#6b7280', '#10b981']
    return labels.map((name, i) => ({ name, count: counts[i], fill: colors[i] }))
  }, [targetDraws])

  // 합계 분포 (버킷)
  const sumData = useMemo(() => {
    const buckets = {}
    for (let i = 50; i <= 250; i += 25) buckets[i] = 0
    targetDraws.forEach((d) => {
      if (!d.numbers) return
      const sum = d.numbers.reduce((a, b) => a + b, 0)
      const bucket = Math.floor(sum / 25) * 25
      if (buckets[bucket] !== undefined) buckets[bucket]++
      else buckets[bucket] = 1
    })
    return Object.entries(buckets)
      .map(([key, count]) => ({ range: `${key}~${parseInt(key) + 24}`, count }))
      .sort((a, b) => parseInt(a.range) - parseInt(b.range))
  }, [targetDraws])

  if (isLoadingDraws) {
    return (
      <div className="stats-loading">
        <div className="loading-spinner" />
        <p>최근 당첨 데이터를 불러오는 중...</p>
        <p className="stats-loading__sub">동행복권 API → CORS 프록시 순으로 시도합니다</p>
      </div>
    )
  }

  if (drawsError || recentDraws.length === 0) {
    return (
      <div className="stats-empty">
        <div className="stats-empty__icon">⚠️</div>
        <p className="stats-empty__title">당첨 데이터를 불러오지 못했습니다</p>
        <p className="stats-empty__desc">{drawsError || '네트워크를 확인하고 다시 시도해주세요'}</p>
        <button className="retry-btn" onClick={handleRetry}>🔄 다시 시도</button>
      </div>
    )
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>당첨 번호 통계</h1>
        <div className="range-tabs">
          {[10, 20, 50].map((r) => (
            <button
              key={r}
              className={`range-tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              최근 {r}회
            </button>
          ))}
        </div>
      </div>

      {/* Hot / Cold */}
      <div className="hot-cold-row">
        <div className="hot-cold-card hot">
          <div className="hc-label">🔥 HOT 번호</div>
          <div className="hc-desc">최근 {Math.min(range, 20)}회 자주 등장</div>
          <div className="hc-balls">
            {hot.map((n) => <LottoBall key={n} number={n} size="sm" />)}
          </div>
        </div>
        <div className="hot-cold-card cold">
          <div className="hc-label">❄️ COLD 번호</div>
          <div className="hc-desc">최근 {Math.min(range, 20)}회 적게 등장</div>
          <div className="hc-balls">
            {cold.map((n) => <LottoBall key={n} number={n} size="sm" dim />)}
          </div>
        </div>
      </div>

      {/* 번호별 출현 빈도 바차트 */}
      <div className="chart-card">
        <h2>번호별 출현 빈도</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={freqData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="num"
                tick={{ fill: '#8b8fa8', fontSize: 9 }}
                interval={4}
              />
              <YAxis tick={{ fill: '#8b8fa8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {freqData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 홀짝 + 구간 분포 */}
      <div className="chart-row">
        <div className="chart-card">
          <h2>홀짝 분포</h2>
          <div className="chart-wrap chart-wrap--sm">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={oddEvenData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {oddEvenData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: '0.78rem', color: '#8b8fa8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2>구간 분포</h2>
          <div className="chart-wrap chart-wrap--sm">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8b8fa8', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ background: '#fff', border: '1px solid #e4e6ef', borderRadius: 8 }}
                  labelStyle={{ color: '#1a1b2e' }}
                  itemStyle={{ color: '#d97706' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sectionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 합계 분포 */}
      <div className="chart-card">
        <h2>당첨번호 합계 분포</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sumData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="range" tick={{ fill: '#8b8fa8', fontSize: 9 }} />
              <YAxis tick={{ fill: '#8b8fa8', fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{ background: '#fff', border: '1px solid #e4e6ef', borderRadius: 8 }}
                labelStyle={{ color: '#1a1b2e' }}
                itemStyle={{ color: '#7c3aed' }}
              />
              <Bar dataKey="count" fill="#8b5cf6" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 최근 당첨번호 리스트 */}
      <div className="chart-card">
        <h2>최근 당첨번호 ({targetDraws.length}회)</h2>
        <div className="draw-list">
          {targetDraws.map((draw) => (
            <div key={draw.round} className="draw-item">
              <div className="draw-item__meta">
                <span className="draw-item__round">{draw.round}회</span>
                <span className="draw-item__date">{draw.date}</span>
              </div>
              <div className="draw-item__balls">
                {draw.numbers?.map((n) => <LottoBall key={n} number={n} size="sm" />)}
                <span className="bonus-sep">+</span>
                <LottoBall number={draw.bonus} size="sm" />
              </div>
              {draw.firstPrize && (
                <div className="draw-item__prize">
                  1등 {draw.firstWinnerCount}명 · {Number(draw.firstPrize).toLocaleString()}원
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
