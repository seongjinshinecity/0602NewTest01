# ☕ DAILY BREW — 카페 사장님 대시보드 (개인 프로젝트 v1)

> **A morning briefing for solo café owners.** — 포스기·리뷰·날씨를 30초 브리핑 한 화면으로.

혼자 카페를 꾸리는 사장님이 아침에 열면 "오늘 매출 흐름 + 날씨 기반 준비 팁 + 체크할 리뷰"를
브리핑 한 단락으로 보여주는 1인 사장님 전용 운영 화면. 6주차 보스 퀘스트 프로토타입을
**7주차 파이널 퀘스트에서 v1으로 완성**했다 (기획서: `../personal-project/` MISSION·DEV·AUDIENCES).

## 🔗 배포 URL

**https://boss-dashboard-virid.vercel.app**
(회원가입 후 로그인하면 대시보드 진입 — 로그인 전엔 게이트만 보임)

## v1 핵심 기능 — 매출 수기 입력 (7주차 완성)

DEV.md Phase 2.5의 **"실사용의 관문"** — 시드 데이터에서 실제 장부로 넘어가는 기능.

- 상단 **✏️ 매출 입력** 버튼 → 날짜·메뉴·카테고리·수량·총액 입력 → 저장 즉시 대시보드 반영
- 같은 날짜의 입력 내역 목록 + 합계 + 삭제(정정) 지원
- 서버 검증: 날짜 형식·수량 정수·금액 양수, 로그인(`requireAuth`) 필수
- API: `POST /api/sales` · `GET /api/sales?date=` · `DELETE /api/sales/:id`

발표용 썸네일·데모 영상 등 v1 발표 자산: [`../../Week-8/daily-brew-v1/`](../../Week-8/daily-brew-v1/)

## 미션 매핑

| Part | 구현 |
|---|---|
| **1. Auth** | 이메일/비밀번호 로그인·회원가입 (bcrypt+세션 쿠키). `/api/dashboard`는 `requireAuth` — 사장님만 |
| **2. 데이터 소스 2개** | ① **Supabase DB** — `cafe_sales`(14일 판매)·`cafe_reviews`(리뷰) ② **Open-Meteo 날씨 API** — 성수동 좌표 실시간 (키 불필요) |
| **3. 브리핑** | 두 소스를 서버가 종합: 매출(전일 대비%) + 주간 1위 메뉴 + 실시간 날씨 + **날씨 연동 운영 추천**(비 예보→세트 입간판 / 더위→아이스 재료) + 체크할 저평점 리뷰 |
| **4. UI & 배포** | 위젯 6개(브리핑·오늘 매출·날씨·TOP3·주간 바차트·최근 리뷰) 한 화면 + **Vercel 배포** |

## 위젯

- ☀️ **오늘의 카페 브리핑** — 5줄 요약 (데이터 소스 표기)
- 오늘 매출 + 전일 대비 ▲▼ + 카테고리 내역
- 성수동 실시간 날씨 (현재/최저최고/강수확률)
- 이번 주 인기 메뉴 TOP3
- 최근 7일 매출 바 차트 (오늘 = 골드 강조)
- 최근 손님 리뷰 4건 (별점)

## 브리핑 생성 방식 (정직 고지)

AI API 키 없이 동작하도록 **서버 규칙 기반 생성**이다 — DB 수치와 날씨 조건을 조합해 문장을 만든다
(예: 강수확률 ≥60% → 테이크아웃 감소 대응 제안). LLM 호출로 바꾸려면 `/api/dashboard`의
브리핑 블록만 교체하면 된다.

## 실행 (로컬)

```bash
npm install
cp ../shopping-mall-complete/.env .env   # DATABASE_URL
npm start                                 # → http://localhost:3020
```

## 스크린샷 · 데모

- `screenshots/01-login-gate.png` — 로그인 게이트 (비로그인)
- `screenshots/02-dashboard-prod.png` — 배포판 대시보드 전체 (실시간 날씨 브리핑 포함)
- v1 발표 자산 (→ [`../../Week-8/daily-brew-v1/`](../../Week-8/daily-brew-v1/)로 이동):
  - `03-v1-sales-entry-prod.jpg` — **v1 매출 수기 입력** (배포판, 입력 2건 + 대시보드 즉시 반영)
  - `daily-brew-v1-demo.mp4` — **데모 영상 28초** (로그인 → 매출 입력 2건 → 대시보드 반영 → 차트/리뷰)
  - `thumbnail-1920x1080.png` — 발표용 썸네일 (`thumbnail.html`)
  - `agent-chat-v1.png` — 에이전트 대화 스크린샷

## 회고 (v1)

잘 된 것 — "기능 10개 반쪽보다 1개 완성"이라는 기획서 원칙을 지켰다. 매출 수기 입력 하나를
검증·정정(삭제)·즉시 반영까지 끝까지 붙였고, 6주차 프로토타입 구조(Express+Supabase+세션)를
그대로 재사용해서 구현 자체는 반나절이 안 걸렸다. 배포 파이프라인(Vercel)도 이미 있어서
"배포 먼저"가 실제로 통했다. 아쉬운 것 — Supabase 무료 플랜 휴면 때문에 배포 URL이 500으로
죽어 있었다는 걸 뒤늦게 알았다. 실사용(주 5회 아침 브리핑)이 시작되면 자동으로 안 생길 문제지만,
"배포했다"와 "살아있다"는 다르다는 걸 배웠다. 다음은 DEV.md Phase 3의 LLM 브리핑과
리뷰 수기 입력이다.

## 출처·연계
- 운영 데이터는 [Context+Agent+DB] 퀘스트(`../cafe-ai-agent`)에서 시드한 동일 Supabase 테이블 재사용
- 인증·배포 구조는 [Payment+File] 쇼핑몰(`../shopping-mall-complete`)에서 재사용 — 4주차 코드 재활용 팁 반영
