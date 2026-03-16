import React, { useEffect, useState } from 'react'
import useLottoStore from '../store/useLottoStore'
import LottoBall from '../components/LottoBall'
import { analyzeNumbers } from '../utils/lottoGenerator'
import './MainPage.scss'

const MODES = [
  { id: 'random', label: '완전 랜덤', icon: '🎲', desc: '순수 무작위 생성' },
  { id: 'stats', label: '통계 기반', icon: '📊', desc: '최근 회차 데이터 반영' },
  { id: 'balanced', label: '균형형', icon: '⚖️', desc: '구간 분산 + 조건 검증' },
]

function NumberSelector({ title, desc, mode, excludeNums, includeNums, toggleExclude, toggleInclude }) {
  return (
    <div className="num-selector">
      <div className="num-selector__header">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <div className="num-selector__grid">
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
          const isExclude = excludeNums.includes(n)
          const isInclude = includeNums.includes(n)
          return (
            <button
              key={n}
              className={`num-btn ${isExclude ? 'exclude' : ''} ${isInclude ? 'include' : ''}`}
              onClick={() => {
                if (mode === 'exclude') toggleExclude(n)
                else toggleInclude(n)
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResultCard({ numbers, index, mode, onSave, onCopy, recentDraw }) {
  const info = analyzeNumbers(numbers)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = numbers.join(', ')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      onCopy?.()
    })
  }

  const matchNums = recentDraw?.numbers || []

  return (
    <div className="result-card">
      <div className="result-card__header">
        <span className="result-card__label">
          {String.fromCharCode(65 + index)}조
        </span>
        <div className="result-card__actions">
          <button className="icon-btn" onClick={handleCopy} title="복사">
            {copied ? '✓' : '📋'}
          </button>
          <button className="icon-btn save-btn" onClick={() => onSave(numbers, mode)} title="저장">
            💾
          </button>
        </div>
      </div>

      <div className="result-card__balls">
        {numbers.map((n) => (
          <LottoBall
            key={n}
            number={n}
            size="md"
            highlight={matchNums.includes(n)}
          />
        ))}
      </div>

      <div className="result-card__info">
        <span>합: <b>{info.sum}</b></span>
        <span>홀짝: <b>{info.oddCount}:{info.evenCount}</b></span>
        <span>연속: <b>{info.consecutivePairs}쌍</b></span>
        {matchNums.length > 0 && (
          <span className="match-count">
            최신 회차 일치: <b>{numbers.filter(n => matchNums.includes(n)).length}개</b>
          </span>
        )}
      </div>
    </div>
  )
}

export default function MainPage() {
  const {
    mode, setMode,
    excludeNums, includeNums, toggleExclude, toggleInclude, resetNums,
    generatedSets, isGenerating, generate,
    recentDraws, loadRecentDraws,
    saveNumbers,
  } = useLottoStore()

  const [selectorMode, setSelectorMode] = useState('exclude')
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    loadRecentDraws()
  }, [loadRecentDraws])

  const handleSave = (numbers, currentMode) => {
    saveNumbers(numbers, currentMode)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  const latestDraw = recentDraws[0]

  return (
    <div className="main-page">
      {/* Hero */}
      <div className="hero">
        <h1 className="hero__title">
          통계 기반<br />로또 번호 추천
        </h1>
        <p className="hero__sub">
          최근 회차 데이터를 분석해 편향 없는 균형 분산형 번호를 생성합니다
        </p>
        {latestDraw && (
          <div className="latest-draw">
            <span className="latest-draw__label">최신 당첨번호 ({latestDraw.round}회)</span>
            <div className="latest-draw__balls">
              {latestDraw.numbers.map((n) => (
                <LottoBall key={n} number={n} size="sm" />
              ))}
              <span className="bonus-label">+</span>
              <LottoBall number={latestDraw.bonus} size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* 생성 방식 선택 */}
      <section className="section">
        <h2 className="section__title">생성 방식</h2>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span className="mode-card__icon">{m.icon}</span>
              <span className="mode-card__label">{m.label}</span>
              <span className="mode-card__desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 번호 설정 */}
      <section className="section">
        <div className="section__title-row">
          <h2 className="section__title">번호 설정</h2>
          <button className="text-btn" onClick={resetNums}>초기화</button>
        </div>

        <div className="selector-tabs">
          <button
            className={`selector-tab ${selectorMode === 'exclude' ? 'active' : ''}`}
            onClick={() => setSelectorMode('exclude')}
          >
            제외 번호 {excludeNums.length > 0 && <span className="badge">{excludeNums.length}</span>}
          </button>
          <button
            className={`selector-tab ${selectorMode === 'include' ? 'active' : ''}`}
            onClick={() => setSelectorMode('include')}
          >
            포함 희망 번호 {includeNums.length > 0 && <span className="badge">{includeNums.length}</span>}
          </button>
        </div>

        <NumberSelector
          title={selectorMode === 'exclude' ? '제외할 번호' : '포함할 번호 (최대 5개)'}
          desc={
            selectorMode === 'exclude'
              ? '생성에서 제외할 번호를 선택하세요'
              : '반드시 포함할 번호를 선택하세요 (최대 5개)'
          }
          mode={selectorMode}
          excludeNums={excludeNums}
          includeNums={includeNums}
          toggleExclude={toggleExclude}
          toggleInclude={toggleInclude}
        />

        {/* 선택된 번호 미리보기 */}
        {(excludeNums.length > 0 || includeNums.length > 0) && (
          <div className="selected-preview">
            {excludeNums.length > 0 && (
              <div className="selected-preview__row">
                <span className="preview-label exclude">제외</span>
                <div className="preview-balls">
                  {excludeNums.sort((a, b) => a - b).map((n) => (
                    <LottoBall key={n} number={n} size="sm" dim />
                  ))}
                </div>
              </div>
            )}
            {includeNums.length > 0 && (
              <div className="selected-preview__row">
                <span className="preview-label include">포함</span>
                <div className="preview-balls">
                  {includeNums.sort((a, b) => a - b).map((n) => (
                    <LottoBall key={n} number={n} size="sm" highlight />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 생성 버튼 */}
      <div className="generate-wrap">
        <button
          className={`generate-btn ${isGenerating ? 'generating' : ''}`}
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spin">⚙️</span> 번호 생성 중...
            </>
          ) : (
            <>
              🎯 번호 생성하기
            </>
          )}
        </button>
      </div>

      {/* 결과 */}
      {generatedSets.length > 0 && (
        <section className="section results-section">
          <h2 className="section__title">생성된 번호</h2>
          <div className="results-grid">
            {generatedSets.map((set, i) => (
              <ResultCard
                key={i}
                index={i}
                numbers={set}
                mode={mode}
                onSave={handleSave}
                recentDraw={latestDraw}
              />
            ))}
          </div>
        </section>
      )}

      {/* 저장 토스트 */}
      {savedToast && (
        <div className="toast">💾 내 번호 보관함에 저장되었습니다</div>
      )}
    </div>
  )
}
