# Week5-2 — 5주차 배치1 (풀스택 웹앱 4종)

AI 공장장 부트캠프 5주차 **배치1**(Auth · DB · CRUD)을 한 모노레포로 구현. 공용 인증·DB 모듈을 4개 앱이 공유한다.

## 앱 목록
| 앱 | 퀘스트 | 포트 | 실행 |
|---|---|---|---|
| [budget-app](budget-app/) | [Server+DB] 가계부 | 3000 | `npm run budget` |
| [community-app](community-app/) | [Auth] 커뮤니티 (본인 글만 수정/삭제) | 3001 | `npm run community` |
| [shopping-mall](shopping-mall/) | [Auth+DB] 쇼핑몰 (장바구니, 결제 제외) | 3002 | `npm run shop` |
| [cafe-dashboard](cafe-dashboard/) | [보스] 카페 대시보드 (DB+날씨 API+AI 브리핑) | 3003 | `npm run cafe` |

## 공통 스택
- **Express + `pg`** → Supabase Postgres (`shared/db.js`)
- **인증** `shared/auth.js` — bcrypt 해시 + HMAC 서명 세션 쿠키. 소유권은 `user_id` + SQL 조건으로 강제
- **프론트** 앱마다 단일 `public/index.html`. 신규 3개(커뮤니티·쇼핑몰·카페)는 바닐라 JS SPA, budget-app은 React 18 + `@babel/standalone`(Week5에서 이식)

## 빠른 시작
```bash
cd Week5-2
npm install                 # 공용 deps 1회
cp .env.example .env        # DATABASE_URL(Supabase 6543 pooler) + SESSION_SECRET 채우기
npm run budget              # 또는 community / shop / cafe
```
서버 첫 실행 시 각 앱이 자기 테이블을 자동 생성하고(쇼핑몰·카페는 샘플 데이터 시드) 시작한다.

## 구조
```
Week5-2/
├── package.json        # 공용 deps + 실행 스크립트
├── .env / .env.example # DATABASE_URL, SESSION_SECRET (공유)
├── shared/
│   ├── db.js           # pg Pool (Supabase, SSL 자동)
│   └── auth.js         # 회원가입/로그인/세션 (bcrypt+HMAC), requireAuth
├── budget-app/         # 가계부 (Week5에서 이식)
├── community-app/      # 커뮤니티
├── shopping-mall/      # 쇼핑몰
└── cafe-dashboard/     # 카페 대시보드(보스)
```

## 가이드와의 의도적 차이 (각 앱 README에도 명시)
1. **Next.js → Express + 바닐라 SPA** — 레포에 이미 검증된 가계부 스택을 재사용(일관성).
2. **Supabase Auth/RLS → 앱 레벨 인증(bcrypt+세션)** — pg 직결 패턴 유지. 권한 분기 학습 목표는 동일하게 충족하며, 바꾸려면 `shared/auth.js` 한 파일만 교체.
3. 배포(Vercel)는 미포함 — 로컬 실행 + 스크린샷까지가 이번 범위. (다음 단계로 안내)
