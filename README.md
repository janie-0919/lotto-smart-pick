# 🎱 로또 스마트픽

> 통계 기반 로또 번호 추천 서비스

**[lotto-smart-pick.vercel.app](https://lotto-smart-pick.vercel.app)**

---

## 주요 기능

### 번호 생성 (3가지 모드)
- **완전 랜덤** — 순수 무작위 생성
- **통계 기반** — 최근 50회차 출현 빈도 반영
- **균형형** — 구간 분산 + 홀짝 비율 + 합계 범위(100~175) 조건 검증

### 번호 설정
- 제외할 번호 / 포함 희망 번호 선택
- 5세트 동시 생성

### 통계 페이지
- HOT/COLD 번호 (최근 20회 기준)
- 번호별 출현 빈도 차트
- 홀짝 분포 / 구간 분포 차트
- 최근 당첨 이력 목록

### 내 번호
- 생성한 번호 저장 (localStorage)
- 최신 당첨 결과와 자동 비교 (일치 개수 표시)

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Frontend | React 18, Vite 5 |
| Styling | SCSS, CSS Variables |
| 상태 관리 | Zustand (localStorage persist) |
| 차트 | Recharts |
| 라우팅 | React Router v6 |
| 배포 | Vercel (Serverless Function 포함) |

---

## 로컬 실행

```bash
npm install
npm run dev
```

---

## 프로젝트 구조

```
├── api/
│   └── lotto.js          # Vercel Serverless 프록시
├── public/
│   ├── favicon.ico
│   └── og-image.png
└── src/
    ├── components/
    │   ├── Layout.jsx     # 공통 레이아웃 (헤더/네비)
    │   └── LottoBall.jsx  # 번호 볼 컴포넌트
    ├── pages/
    │   ├── MainPage.jsx       # 번호 생성
    │   ├── StatisticsPage.jsx # 통계
    │   └── MyNumbersPage.jsx  # 내 번호
    ├── store/
    │   └── useLottoStore.js   # Zustand 전역 상태
    └── utils/
        ├── lottoApi.js        # API 연동 + 캐싱
        └── lottoGenerator.js  # 번호 생성 로직
```

---

## API

동행복권 공식 API를 Vercel Serverless Function으로 프록시합니다.

```
GET /api/lotto?drwNo={회차}
→ https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd={회차}
```

응답 데이터는 6시간 단위로 localStorage에 캐싱됩니다.
