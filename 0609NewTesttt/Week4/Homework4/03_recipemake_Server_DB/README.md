# 🧑‍🍳 냉장고 셰프 — AI 레시피 메이커 (Server + DB)

냉장고 **재료를 DB에 등록**해 두면, **그 재료를 읽어 AI(Claude)가 볶음 레시피를 자동 생성**하고, 마음에 들면 **DB(PostgreSQL)에 저장**해 **목록으로 조회**할 수 있는 풀스택 웹앱입니다.
디자인은 **SMEG 냉장고 + 1970년대 미국 레트로** 무드 — 민트 컬러 `#5cffd1` / `#BDFCC9`, 둥근 라인, 70s 스트라이프로 꾸몄습니다.

### 데이터 흐름
```
[DB에서 재료 조회] → [Server: AI API 호출] → [레시피 자동 생성] → [DB에 저장] → [레시피 목록에 표시]
```

![냉장고 셰프 화면](screenshot.png)

## ✨ 기능

- **재료 DB 관리** — 냉장고 재료를 등록/조회/삭제 (`ingredients` 테이블).
- **AI 레시피 생성** — DB에 저장된 재료를 읽어 Claude가 **볶음요리** 레시피(이름·소개·재료·조리순서·시간·난이도)를 생성합니다.
- **DB 저장** — 생성된 레시피를 PostgreSQL에 저장 (`AI 생성`/`데모 생성` 출처 표시).
- **목록 조회** — 저장된 레시피를 카드로 조회하고 펼쳐 보기 / 삭제.
- **키 없이도 동작** — `ANTHROPIC_API_KEY`가 없으면 규칙 기반 폴백 생성기로 대체.

## 🚀 실행 방법

```bash
npm install
npm start
# → http://localhost:3004
```

기본값(키 없음)으로도 바로 실행됩니다. 데이터는 임베디드 PostgreSQL(PGlite)의 `./data`에 저장됩니다.

## 🤖 진짜 AI로 생성하기 (Claude)

> `ANTHROPIC_API_KEY`가 있으면 실제 **Claude(`claude-opus-4-8`)** 가 레시피를 생성합니다.
> 없으면 자동으로 규칙 기반 폴백 생성기로 동작하므로(화면에 "데모 모드"로 표시) 키 없이도 앱은 정상 작동합니다.

1. [Anthropic Console](https://console.anthropic.com/settings/keys)에서 API 키를 발급합니다.
2. 이 폴더에 `.env` 파일을 만들고 한 줄을 넣습니다:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. `npm start` — 화면 상단에 `✨ AI 연결됨 · claude-opus-4-8`이 표시됩니다.

생성은 공식 **Anthropic SDK**(`@anthropic-ai/sdk`)와 **구조화된 출력(structured outputs)** 으로 일정한 JSON 형태의 레시피를 받아옵니다. (`server.js`의 `RECIPE_SCHEMA` 참고)

## 🐘 Supabase에 저장하기

테이블은 첫 연결 시 `CREATE TABLE IF NOT EXISTS`로 자동 생성됩니다(수동 SQL 불필요).

1. Supabase 대시보드 → **Project Settings → Database → Connection string(URI)** 복사.
2. `.env`에 추가:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
3. `npm start` — 콘솔에 `🐘 PostgreSQL(Supabase / DATABASE_URL) 연결됨`이 보이면 성공.

## 🔌 REST API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/status` | AI 사용 가능 여부 / 모델명 |
| GET | `/api/ingredients` | 냉장고 재료 목록 조회 |
| POST | `/api/ingredients` | 재료 등록 `{ name }` |
| DELETE | `/api/ingredients/:id` | 재료 삭제 |
| POST | `/api/recipes/generate` | **DB의 재료를 읽어** 레시피 생성(저장 X, body 불필요) |
| GET | `/api/recipes` | 저장된 레시피 목록 |
| POST | `/api/recipes` | 레시피 저장 |
| DELETE | `/api/recipes/:id` | 레시피 삭제 |

## 🗂 데이터베이스 스키마

```sql
-- 냉장고 재료 (AI 생성의 입력 소스)
CREATE TABLE ingredients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recipes (
  id                SERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  ingredients       TEXT NOT NULL DEFAULT '[]',  -- JSON 배열
  steps             TEXT NOT NULL DEFAULT '[]',  -- JSON 배열
  used_ingredients  TEXT NOT NULL DEFAULT '[]',  -- JSON 배열 (입력 재료)
  cook_time         TEXT NOT NULL DEFAULT '',
  difficulty        TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL DEFAULT 'ai',   -- 'ai' | 'fallback'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🛠 기술 스택

- **프런트엔드** — React 18 + Tailwind (CDN, 단일 `index.html`)
  - **디자인** — SMEG 냉장고 + 70s 미국 레트로: 민트(`#5cffd1`/`#BDFCC9`) 본체, 크롬 손잡이, Jua/Pacifico 폰트, 70s 스트라이프·도트 패턴
- **백엔드** — Node.js + Express 5 (REST API)
- **AI** — Anthropic Claude (`claude-opus-4-8`) · 공식 SDK · 구조화된 출력 / 폴백 생성기
- **데이터베이스** — PostgreSQL · 로컬 PGlite / 운영 Supabase
- **배포** — Vercel (`vercel.json`)

## 📁 파일 구성

```
03_recipemake_Server_DB/
├── index.html      # React + Tailwind 프런트엔드 (SMEG/70s 디자인)
├── server.js       # Express REST API + AI 생성(Claude)/폴백
├── db.js           # PostgreSQL 모듈 (PGlite / Supabase 자동 전환)
├── package.json
├── vercel.json
├── .env.example    # ANTHROPIC_API_KEY / DATABASE_URL 예시
└── README.md
```
