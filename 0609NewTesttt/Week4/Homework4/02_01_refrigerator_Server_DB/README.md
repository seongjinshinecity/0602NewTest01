# 🧊 냉장고 재료 & 레시피 (Server + DB)

냉장고에 있는 **재료를 등록/삭제**하고, **레시피를 직접 작성**하거나 **냉장고 재료로 간단한 레시피를 자동 생성**해 저장하는 풀스택 웹앱입니다.
모든 데이터는 **PostgreSQL** 에 저장됩니다 — 로컬에서는 설치 없이 **PGlite(임베디드 PostgreSQL)**, 운영에서는 **Supabase** 를 그대로 연결할 수 있습니다.

| 냉장고 재료 탭 | 레시피 탭 |
| :---: | :---: |
| ![냉장고 재료](screenshot.png) | ![레시피](screenshot-recipe.png) |

## ✨ 기능

- **냉장고 재료 관리** — 이름·수량·카테고리로 재료 등록, 카테고리별 그룹 조회, 한 번에 삭제
- **레시피 직접 작성** — 제목·재료·조리순서를 입력해 저장
- **레시피 자동 생성** — 현재 냉장고에 등록된 재료를 골라 간단한 레시피(볶음/국/무침)를 만들어 저장 (`자동` 배지)
- **목록 조회** — 저장된 재료와 레시피를 최신순으로 조회
- **DB 영속화** — 앱을 껐다 켜도 데이터 유지 (PGlite `./data` 또는 Supabase)

## 🚀 실행 방법

```bash
npm install
npm start
# → http://localhost:3003
```

`DATABASE_URL` 이 없으면 자동으로 **PGlite** 가 켜지므로, 별도 DB 설치 없이 바로 동작합니다.
데이터는 이 폴더의 `./data` 디렉터리에 저장됩니다.

## 🐘 Supabase 에 저장하기

> 과제 요구사항인 "모든 데이터는 Supabase 에 저장" 을 만족하려면 아래처럼 연결합니다.
> 테이블은 첫 연결 시 `CREATE TABLE IF NOT EXISTS` 로 **자동 생성**되므로 수동 SQL 이 필요 없습니다.

1. [Supabase](https://supabase.com) 에서 프로젝트를 생성합니다.
2. 대시보드에서 **Project Settings → Database → Connection string → `URI`** 값을 복사합니다.
   (연결 풀러를 쓰려면 *Connection pooling* 의 URI 를 사용)
3. 이 폴더에 `.env` 파일을 만들고 한 줄을 넣습니다 (`[YOUR-PASSWORD]` 는 실제 DB 비밀번호로 교체):

   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

   > `.env.example` 파일을 복사해 사용해도 됩니다. `.env` 는 `.gitignore` 에 포함되어 커밋되지 않습니다.
4. `npm start` — 콘솔에 `🐘 PostgreSQL(Supabase / DATABASE_URL) 연결됨` 이 보이면 성공입니다.

Supabase 대시보드의 **Table Editor → `ingredients` / `recipes`** 에서 저장된 데이터를 직접 확인할 수 있습니다.

## 🗂 데이터베이스 스키마

```sql
CREATE TABLE ingredients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,           -- 재료 이름 (예: 양파)
  category    TEXT NOT NULL,           -- 카테고리 (신선칸/냉장/냉동/양념 등)
  quantity    TEXT NOT NULL DEFAULT '',-- 수량 (예: 2개)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recipes (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,          -- 레시피 제목
  ingredients  TEXT NOT NULL DEFAULT '',
  steps        TEXT NOT NULL DEFAULT '',
  source       TEXT NOT NULL DEFAULT 'manual', -- 'manual'(직접) | 'auto'(자동)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🔌 REST API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/ingredients` | 재료 목록 조회 |
| POST | `/api/ingredients` | 재료 등록 `{ name, category, quantity }` |
| DELETE | `/api/ingredients/:id` | 재료 삭제 |
| GET | `/api/recipes` | 레시피 목록 조회 |
| POST | `/api/recipes` | 레시피 작성 `{ title, ingredients, steps }` |
| DELETE | `/api/recipes/:id` | 레시피 삭제 |
| POST | `/api/recipes/auto` | 냉장고 재료로 레시피 자동 생성·저장 (`{ preview: true }` 면 저장 없이 미리보기) |

## 🛠 기술 스택

- **프런트엔드** — React 18 + Tailwind CSS (CDN, 빌드 도구 없는 단일 `index.html`)
- **백엔드** — Node.js + Express 5 (REST API)
- **데이터베이스** — PostgreSQL · 로컬 PGlite / 운영 Supabase (동일 코드, `DATABASE_URL` 만 교체)
- **배포** — Vercel (`vercel.json` 포함)

## 📁 파일 구성

```
02_01_refrigerator_Server_DB/
├── index.html      # React + Tailwind 프런트엔드 (냉장고/레시피 탭)
├── server.js       # Express REST API + 레시피 자동 생성기
├── db.js           # PostgreSQL 모듈 (PGlite / Supabase 자동 전환)
├── package.json
├── vercel.json     # Vercel 배포 설정
├── .env.example    # Supabase 연결 예시
└── README.md
```
