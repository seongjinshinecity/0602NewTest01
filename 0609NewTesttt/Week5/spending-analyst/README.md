# 🧠 소비 분석가 (spending-analyst)

가계부(budget-app)와 **같은 Supabase DB**에 접속하는 Claude 에이전트. 말로 질문하면 DB를 직접 조회·집계해서 한국어로 분석해준다.

## 흐름

```
[가계부 앱으로 데이터 쌓기]
   → [에이전트가 Supabase DB 접속]
   → [사용자 질문]
   → Claude가 read-only SQL(run_sql 툴)로 DB 조회 + AI 분석
   → [맞춤형 답변]
```

- **DB**: budget-app 의 `entries` 테이블을 그대로 공유 (수입/지출 내역)
- **에이전트**: Claude(`@anthropic-ai/sdk`) + tool use. `run_sql` 툴로 DB를 조회하며, 한 질문에 여러 번 조회 가능
- **안전장치**: SQL은 **읽기 전용**만 허용 — SELECT/WITH 만 통과, INSERT/UPDATE/DELETE/DROP 등 차단, READ ONLY 트랜잭션 + statement_timeout + 결과 1,000행 제한

## 예시 질문

- "이번 달 지출이 가장 큰 카테고리 3개 알려줘"
- "지난 몇 달 동안 식비가 늘었어 줄었어?"
- "구독료에 매달 얼마 쓰고 있어?"
- "수입 대비 지출 비율이 어때?"

답변과 함께 **에이전트가 실제로 실행한 SQL**을 펼쳐볼 수 있어 (투명성).

## 실행 방법

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 (.env.example 참고)
cp .env.example .env
#   DATABASE_URL      → budget-app 의 .env 와 동일한 Supabase 값
#   ANTHROPIC_API_KEY → https://console.anthropic.com 에서 발급
#   ANALYST_MODEL     → (선택) 기본 claude-opus-4-8

# 3) 실행
npm start            # 또는 npm run dev

# 4) http://localhost:3100 접속 후 질문
```

> 가계부에 데이터가 쌓여 있어야 분석할 게 있다. budget-app 으로 먼저 내역을 등록하거나 샘플을 넣어두자.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ask` | `{ "question": "..." }` → `{ answer, steps:[{sql,rowCount}] }` |

## 기술 스택

- **에이전트**: Claude (`@anthropic-ai/sdk`) tool use 루프 (manual agentic loop)
- **DB**: Supabase(PostgreSQL), `pg` — 읽기 전용 SQL 실행
- **Server**: Node.js + Express (ESM)
- **Front**: React + Tailwind (CDN, 단일 `public/index.html`, `@babel/standalone` v7 고정), 블랙앤그레이 톤

## 파일 구조

```
spending-analyst/
├── server.js          # Express + pg + Claude tool-use 에이전트 (run_sql 툴)
├── public/index.html  # 채팅 UI (질문 + 답변 + 실행 SQL 표시)
├── .env.example       # DATABASE_URL / ANTHROPIC_API_KEY / 모델 / 포트
├── package.json
└── command-input.txt
```

## 보안 메모

- `run_sql` 툴은 **SELECT/WITH 전용**이며 데이터 변경 구문을 거부한다. READ ONLY 트랜잭션으로 실행 후 ROLLBACK 한다.
- `.env`(DB·API 키)는 git 에서 제외된다.
- 운영 환경이라면 사용자 인증·요청 제한(rate limit)을 추가하는 것을 권장.
