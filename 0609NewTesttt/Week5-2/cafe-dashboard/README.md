# ☕ QUARTER 사장님 대시보드 (보스 — Auth + 다중 데이터소스 + AI 브리핑)

로그인하면 카페 데이터가 모이고 AI가 "오늘의 브리핑"을 만들어 주는 한-화면 대시보드. (5주차 배치1 — [Auth+MCP+DB+App] 보스 퀘스트)

## 스택 / 데이터소스 (2개 이상 연결)
- **인증** 공용 `shared/auth.js` — 사장님만 접근
- **소스 ① 카페 매출 DB** — Supabase Postgres `cafe_sales` (오늘/어제/7일 매출, 인기 메뉴, 14일 추이)
- **소스 ② 외부 날씨 API** — [Open-Meteo](https://open-meteo.com) (서울, **키 불필요**)
- **AI 브리핑** — 매출 + 날씨를 종합한 규칙 기반 요약 (어제 매출·인기 메뉴·날씨별 권장 액션)

> 가이드대로 "위젯 2~3개만 동작해도 인정" 범위로 **최소 동작**에 맞췄다. Notion MCP 등은
> 같은 패턴으로 소스를 한 개 더 붙이면 확장된다. AI 브리핑은 규칙 기반이며, LLM 호출로
> 교체하려면 `/api/cafe/briefing` 핸들러만 바꾸면 된다.

## 실행
```bash
cd Week5-2
npm install
cp .env.example .env        # DATABASE_URL 채우기
npm run cafe                # → http://localhost:3003
```
첫 실행 시 **최근 30일 매출 샘플**이 자동 시드된다. 가입(이메일/비번) 후 대시보드 진입.

## 위젯
- 🤖 오늘의 AI 브리핑 (인사 + 어제 매출 + 인기 메뉴 + 날씨별 액션 + 페이스)
- 💰 오늘 매출 (어제 대비 증감 %, 7일 누적)
- 🌤️ 오늘 서울 날씨 (Open-Meteo)
- 🏆 이번 주 인기 메뉴 Top 5
- 📊 최근 14일 매출 추이 막대

## API
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/cafe/summary` | 로그인 | 매출 요약 + 인기메뉴 + 추이 |
| GET | `/api/cafe/weather` | 로그인 | 서울 날씨(Open-Meteo) |
| GET | `/api/cafe/briefing` | 로그인 | AI 종합 브리핑 |

## 스크린샷
`screenshots/` 참고 (로그인→데이터 표시→AI 브리핑).

## 다음 단계
Notion MCP 등 소스 추가, AI 브리핑을 LLM 호출로 교체, Vercel 배포.

> ⚠️ 로컬에서는 4개 앱이 쿠키를 공유(localhost 포트 무시)해 통합 로그인처럼 동작한다. 별도 Vercel
> 도메인으로 배포하면 끊기므로 앱마다 같은 `SESSION_SECRET`·`DATABASE_URL` + 쿠키 `Secure` 속성이 필요하다.
