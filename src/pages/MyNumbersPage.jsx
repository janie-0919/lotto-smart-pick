import React, { useState } from 'react'
import useLottoStore from '../store/useLottoStore'
import LottoBall from '../components/LottoBall'
import { analyzeNumbers } from '../utils/lottoGenerator'
import './MyNumbersPage.scss'

const MODE_LABELS = {
  random: '완전 랜덤',
  stats: '통계 기반',
  balanced: '균형형',
}

function SavedCard({ entry, recentDraw, onDelete, onCompare }) {
  const { numbers, mode, savedAt, matchCount, compareRound } = entry
  const info = analyzeNumbers(numbers)
  const winningNums = recentDraw?.numbers || []

  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(numbers.join(', ')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const dateStr = new Date(savedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={`saved-card ${matchCount !== null ? `match-${Math.min(matchCount, 6)}` : ''}`}>
      <div className="saved-card__header">
        <div className="saved-card__meta">
          <span className="mode-badge">{MODE_LABELS[mode] || mode}</span>
          <span className="saved-date">{dateStr}</span>
        </div>
        <div className="saved-card__actions">
          <button className="icon-btn" onClick={handleCopy} title="복사">
            {copied ? '✓' : '📋'}
          </button>
          <button
            className="icon-btn compare-btn"
            onClick={() => onCompare(entry.id, winningNums)}
            title="최신 회차와 비교"
            disabled={winningNums.length === 0}
          >
            🔍
          </button>
          <button className="icon-btn delete-btn" onClick={() => onDelete(entry.id)} title="삭제">
            🗑️
          </button>
        </div>
      </div>

      <div className="saved-card__balls">
        {numbers.map((n) => (
          <LottoBall
            key={n}
            number={n}
            size="md"
            highlight={winningNums.includes(n) && matchCount !== null}
          />
        ))}
      </div>

      <div className="saved-card__footer">
        <div className="saved-card__info">
          <span>합: <b>{info.sum}</b></span>
          <span>홀짝: <b>{info.oddCount}:{info.evenCount}</b></span>
        </div>
        {matchCount !== null && (
          <div className={`match-result match-result--${Math.min(matchCount, 6)}`}>
            {compareRound}회 비교 · <b>{matchCount}개 일치</b>
            {matchCount >= 3 && (
              <span className="match-emoji">
                {matchCount === 6 ? ' 🎉🎉🎉' : matchCount === 5 ? ' 🎊' : matchCount === 4 ? ' ✨' : ' 👍'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyNumbersPage() {
  const { savedNumbers, deleteNumbers, compareNumbers, recentDraws } = useLottoStore()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const latestDraw = recentDraws[0]

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      deleteNumbers(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(null), 2500)
    }
  }

  const handleCompare = (id, winningNums) => {
    if (winningNums.length > 0) compareNumbers(id, winningNums)
  }

  const handleCompareAll = () => {
    if (!latestDraw) return
    savedNumbers.forEach((s) => {
      compareNumbers(s.id, latestDraw.numbers)
    })
  }

  if (savedNumbers.length === 0) {
    return (
      <div className="my-numbers-empty">
        <div className="empty-icon">📂</div>
        <h2>저장된 번호가 없습니다</h2>
        <p>번호 생성 페이지에서 💾 버튼을 눌러 저장하세요</p>
      </div>
    )
  }

  return (
    <div className="my-numbers-page">
      <div className="my-numbers-header">
        <div>
          <h1>내 번호 보관함</h1>
          <p className="my-numbers-sub">저장된 번호 {savedNumbers.length}세트</p>
        </div>
        {latestDraw && (
          <button className="compare-all-btn" onClick={handleCompareAll}>
            🔍 전체 비교 ({latestDraw.round}회)
          </button>
        )}
      </div>

      {latestDraw && (
        <div className="latest-draw-info">
          <span className="ldi-label">최신 당첨번호 ({latestDraw.round}회 · {latestDraw.date})</span>
          <div className="ldi-balls">
            {latestDraw.numbers.map((n) => <LottoBall key={n} number={n} size="sm" />)}
            <span className="bonus-sep">+</span>
            <LottoBall number={latestDraw.bonus} size="sm" />
          </div>
        </div>
      )}

      <div className="saved-grid">
        {savedNumbers.map((entry) => (
          <SavedCard
            key={entry.id}
            entry={entry}
            recentDraw={latestDraw}
            onDelete={handleDelete}
            onCompare={handleCompare}
          />
        ))}
      </div>

      {confirmDeleteId && (
        <div className="toast toast--warn">
          한번 더 누르면 삭제됩니다
        </div>
      )}
    </div>
  )
}
