# ☕ 데일리브루 사장님 대시보드 — [Auth+MCP+DB+App] 보스 퀘스트

로그인한 사장님만 보는 카페 운영 대시보드. **데이터 소스 2개**(Supabase 운영 DB + 날씨 API)를
서버가 종합해 **"오늘의 카페 브리핑"**을 만들어준다.

## 🔗 배포 URL

**https://boss-dashboard-virid.vercel.app**
(회원가입 후 로그인하면 대시보드 진입 — 로그인 전엔 게이트만 보임)

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

## 스크린샷
- `screenshots/01-login-gate.png` — 로그인 게이트 (비로그인)
- `screenshots/02-dashboard-prod.png` — 배포판 대시보드 전체 (실시간 날씨 브리핑 포함)

## 출처·연계
- 운영 데이터는 [Context+Agent+DB] 퀘스트(`../cafe-ai-agent`)에서 시드한 동일 Supabase 테이블 재사용
- 인증·배포 구조는 [Payment+File] 쇼핑몰(`../shopping-mall-complete`)에서 재사용 — 4주차 코드 재활용 팁 반영
