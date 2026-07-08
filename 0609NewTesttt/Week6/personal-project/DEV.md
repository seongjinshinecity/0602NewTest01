# DEV.md — 카페 사장님 대시보드

## 1. 개발 구조 선택

**Option 2 — Supabase 기반** (index.html + Express 서버 + Supabase Postgres)

| 옵션 | 판단 |
|---|---|
| 단일 파일 (index.html) | ✗ 로그인·운영 DB가 필수라 부족 |
| **Supabase 기반** | ✓ **선택** — 사장님 전용 화면(Auth) + 매출/리뷰 DB. 6주차 보스 퀘스트로 프로토타입 검증 완료 |
| Next.js 풀스택 | ✗ 1인용 도구에 과함. SEO 불필요 |

## 2. TODO 리스트 (바이브 코딩)

### Phase 1 — 디자인·프로토타입 🟢 (완료)
- [x] `prototype-v1` — 위젯 6종 한 화면 (브리핑/매출/날씨/TOP3/주간차트/리뷰) → `Week6/boss-dashboard`
- [x] 다크 카페 톤 디자인 (DAILY BREW 브랜딩)
- ✅ **체크포인트**: 배포 URL 열어서 30초 안에 "오늘 상태" 파악되는가 → 통과, commit

### Phase 2 — 기본 기능 🟢
- [x] Auth (이메일 로그인·회원가입, 세션 쿠키)
- [x] 매출 위젯: 오늘 매출 + 전일 대비% + 카테고리 내역
- [x] 최근 7일 바 차트 / 인기 메뉴 TOP3 / 최근 리뷰 4건
- ✅ 체크포인트: 로그인 없이 API 접근 시 401 → 통과, commit

### Phase 2.5 — 외부 연동 검증 🟡
- [x] Open-Meteo 날씨 API (키 불필요) 연결 + 실패 시 위젯 폴백
- [ ] 매출 **수기 입력** 폼 (지금은 시드 데이터 — 실사용의 관문)
- ✅ 체크포인트: 날씨 API 죽어도 대시보드가 뜨는가 → 통과

### Phase 3 — 어려운 기능 🔴 (불확실한 것부터)
- [ ] 브리핑 LLM 업그레이드 — 규칙 기반 → Claude API 호출 (API 키 확보 필요, 실패 시 규칙 기반 유지)
- [ ] 리뷰 자동 수집 (네이버 플레이스 크롤링 — 가능성 검증 먼저, 안 되면 수기 입력)
- [ ] 주간 리포트 (매주 월요일 요약 — 크론)
- ✅ 체크포인트: LLM 브리핑 vs 규칙 브리핑 나란히 비교 후 채택

### Phase 4 — 마무리·배포 🟢
- [x] Vercel 배포 (https://boss-dashboard-virid.vercel.app)
- [ ] 2주 실사용 후 위젯 재배치 (안 보는 위젯 제거 — MISSION의 30초 기준)
- ✅ 체크포인트: 주 5회 사용 지표 달성 여부 리뷰

## 3. 외부 설정 필요 항목

| 항목 | 어디서 | 상태 |
|---|---|---|
| `DATABASE_URL` | Supabase 대시보드 → Connect (pooler) | ✅ 설정됨 |
| `SESSION_SECRET` | 랜덤 문자열 생성 | ✅ 설정됨 |
| Open-Meteo | 키 불필요 (무료) | ✅ 연결됨 |
| `ANTHROPIC_API_KEY` | console.anthropic.com (Phase 3 LLM 브리핑) | ⬜ 미확보 |
| Vercel 프로젝트 | vercel.com — env 등록 | ✅ boss-dashboard |

## 참고
- 프로토타입: `../boss-dashboard` (6주차 보스 퀘스트 산출물 = 이 프로젝트의 Phase 1~2)
- 경쟁 리서치: `./research.md` (캐시노트·Square·네이버 스마트플레이스)
