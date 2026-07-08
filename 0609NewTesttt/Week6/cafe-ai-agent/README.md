# ☕ 내 카페를 아는 AI 에이전트 — [Context+Agent+DB] 퀘스트

`my_cafe.md`(카페 컨텍스트) + Supabase 운영 DB(`cafe_sales`·`cafe_reviews`)를 **둘 다** 읽어
"내 카페(데일리브루)에 딱 맞는" 운영 조언을 주는 AI 파트너. 같은 질문에 일반 AI와 **Before/After 비교** 포함.

## 구성 (미션 매핑)

| Part | 파일 | 내용 |
|---|---|---|
| 1. Context | `my_cafe.md` | 데일리브루 컨셉 — 상호·타겟·시그니처(치즈케이크·크로플)·가격대·**제약(좌석 24석/인력 2명/주방 협소/예산)**·운영 목표 |
| 2. DB | `seed.js` | `cafe_sales` 126행 (2026-06-22~07-05 14일, 9메뉴 3카테고리, 총매출 10,225,500원) + `cafe_reviews` 7건 시드 |
| 3. Agent | `.claude/agents/cafe-partner.md` | 답하기 전 항상 ① `my_cafe.md` Read ② `query.js`로 SQL 실행. 제약 위반 제안 금지 |
| 4. 비교 | `DEMO.md` + `screenshots/` | Before/After **2쌍** 실제 실행 기록 |

- `query.js` — 에이전트용 읽기 전용 SQL 도구 (`node query.js "SELECT ..."`)

## Before / After (실제 실행, 2026-07-08)

| 질문 | Before (일반 AI) | After (cafe-partner) |
|---|---|---|
| 신메뉴 뭐 추가할까? | 말차·소금빵 등 유행 나열 | 매출 1위 치즈케이크(205개·1,332,500원)의 **저부하 시즌 변형** + 품절 리뷰 2건 근거 + 청 에이드(조리 공수 0) |
| 평일 낮 매출 올리려면? | 해피아워·SNS 일반론 | **커피는 이미 주말 수준**(413,400≈410,750원/일), 빈 칸은 디저트·음료임을 특정 → 평일 세트 + 월요일 점심 선포장(3점 리뷰 근거) |

상세: `DEMO.md`. 스크린샷: `screenshots/01-before-after-q1.png`, `02-before-after-q2.png`, `03-my-cafe-md.png`

## 사용법

```bash
npm install
cp ../shopping-mall-complete/.env .env   # DATABASE_URL (Supabase)
node seed.js                              # 최초 1회 — 데이터 시드 (이미 있으면 생략됨)
# 이 폴더에서 claude 실행 후:
#   @cafe-partner 신메뉴 뭐 추가할까? / 평일 낮 매출 어떻게 올릴까? / 리뷰 보고 개선점 알려줘
```

## 핵심 구조

```
[my_cafe.md (컨셉·제약)] + [cafe_sales·cafe_reviews (운영 데이터)]
        → cafe-partner 에이전트가 둘 다 읽음 → 내 카페 맞춤 답변
```

4주차엔 AI가 DB를 읽어도 "어느 카페에나 같은 답"이었다. `my_cafe.md`가 붙는 순간
같은 매출 데이터로도 제약(좌석·인력·주방·예산)을 지키는 **실행 가능한 답**이 나온다.

## 출처
컨텍스트·에이전트 정의는 Week5-2 `my-cafe-agent`에서 이식, DB는 새 Supabase 프로젝트에 재시드,
**Before/After는 이번 세션에서 에이전트를 실제로 실행해 새로 생성·검증**했다 (After는 SQL 6회 실제 실행).
