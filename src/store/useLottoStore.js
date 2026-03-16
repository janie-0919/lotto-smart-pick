import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateSets } from '../utils/lottoGenerator'
import { fetchRecentRounds } from '../utils/lottoApi'

const useLottoStore = create(
  persist(
    (set, get) => ({
      // 생성 설정
      mode: 'balanced', // 'random' | 'stats' | 'balanced'
      excludeNums: [],
      includeNums: [],

      // 생성 결과
      generatedSets: [],
      isGenerating: false,

      // 당첨 데이터
      recentDraws: [],
      isLoadingDraws: false,
      drawsError: null,
      lastFetchTime: null,

      // 내 번호 보관함
      savedNumbers: [],

      // 설정 변경
      setMode: (mode) => set({ mode }),
      toggleExclude: (num) =>
        set((state) => ({
          excludeNums: state.excludeNums.includes(num)
            ? state.excludeNums.filter((n) => n !== num)
            : [...state.excludeNums, num],
          includeNums: state.includeNums.filter((n) => n !== num),
        })),
      toggleInclude: (num) =>
        set((state) => ({
          includeNums: state.includeNums.includes(num)
            ? state.includeNums.filter((n) => n !== num)
            : state.includeNums.length >= 5
            ? state.includeNums
            : [...state.includeNums, num],
          excludeNums: state.excludeNums.filter((n) => n !== num),
        })),
      resetNums: () => set({ excludeNums: [], includeNums: [] }),

      // 번호 생성
      generate: () => {
        const { mode, recentDraws, excludeNums, includeNums } = get()
        set({ isGenerating: true })
        setTimeout(() => {
          const sets = generateSets(mode, recentDraws, excludeNums, includeNums, 5)
          set({ generatedSets: sets, isGenerating: false })
        }, 600)
      },

      // 최근 당첨 데이터 로드
      loadRecentDraws: async () => {
        const { isLoadingDraws, lastFetchTime } = get()
        if (isLoadingDraws) return
        if (lastFetchTime && Date.now() - lastFetchTime < 1000 * 60 * 60) return

        set({ isLoadingDraws: true, drawsError: null })
        try {
          const draws = await fetchRecentRounds(50)
          if (draws.length === 0) {
            set({ drawsError: 'API 응답이 없습니다. 잠시 후 다시 시도해주세요.' })
          } else {
            set({ recentDraws: draws, lastFetchTime: Date.now() })
          }
        } catch (err) {
          console.error('당첨 데이터 로드 실패:', err)
          set({ drawsError: err.message || '데이터를 불러올 수 없습니다.' })
        } finally {
          set({ isLoadingDraws: false })
        }
      },

      // 번호 저장
      saveNumbers: (numbers, mode, round) => {
        const entry = {
          id: Date.now(),
          numbers,
          mode,
          savedAt: new Date().toISOString(),
          compareRound: round || null,
          matchCount: null,
        }
        set((state) => ({ savedNumbers: [entry, ...state.savedNumbers] }))
      },

      // 번호 삭제
      deleteNumbers: (id) =>
        set((state) => ({
          savedNumbers: state.savedNumbers.filter((s) => s.id !== id),
        })),

      // 당첨 비교
      compareNumbers: (id, winningNumbers) => {
        set((state) => ({
          savedNumbers: state.savedNumbers.map((s) => {
            if (s.id !== id) return s
            const matchCount = s.numbers.filter((n) => winningNumbers.includes(n)).length
            return { ...s, matchCount, compareRound: state.recentDraws[0]?.round }
          }),
        }))
      },
    }),
    {
      name: 'lotto-store',
      partialize: (state) => ({
        savedNumbers: state.savedNumbers,
        mode: state.mode,
        excludeNums: state.excludeNums,
        includeNums: state.includeNums,
      }),
    }
  )
)

export default useLottoStore
