# 💌 마음게시판 — 익명 고민·칭찬 보드 (Server + DB)

**익명으로 글을 남기고**, 서로의 글에 **공감(❤️)** 을 눌러줄 수 있는 따뜻한 익명 게시판입니다.
**고민 게시판 / 칭찬 게시판**을 탭으로 나눠 두었고, 글은 **최신순 / 시간순 / 공감순**으로 정렬해 볼 수 있습니다.
모든 글과 공감 수는 **DB(PostgreSQL)에 저장**됩니다.
디자인은 **다크 + 무지갯빛 글로우 그라데이션(글래스모피즘)** 무드 — 깊은 다크 배경 위에 노을·오로라빛 그라데이션과 필름 그레인. 고민 게시판은 차분한 보라·핑크 글로우, 칭찬 게시판은 따뜻한 앰버·코랄 글로우로 분위기가 바뀝니다.

### 데이터 흐름
```
[익명 글 작성] → [Server: DB 저장] → [목록 조회(정렬)] → [공감 버튼 → 공감 수 ±1 → DB 반영]
```

| 🌙 고민 게시판 | ✨ 칭찬 게시판 |
| :---: | :---: |
| ![고민 게시판 화면](screenshot.png) | ![칭찬 게시판 화면](screenshot-praise.png) |

> 게시판 탭에 따라 배경 글로우가 **보라·핑크(고민) ↔ 앰버·코랄(칭찬)** 으로 부드럽게 전환됩니다.

## ✨ 기능

- **두 개의 게시판 (탭)** — 🌧️ 고민 게시판 / 🌟 칭찬 게시판을 탭으로 전환.
- **익명 글쓰기** — 별명은 선택(비우면 자동으로 `익명`). 로그인 없이 누구나 작성.
- **공감 버튼** — 다른 사람의 글에 ❤️ 공감을 누르면 공감 수가 올라갑니다. 한 번 더 누르면 취소(토글).
  - 내가 공감한 글은 **브라우저(localStorage)** 에 기억해 중복 공감을 막습니다. 공감 수는 0 밑으로 내려가지 않습니다.
- **정렬** — **최신순**(새 글 먼저) / **시간순**(오래된 글 먼저) / **공감순**(공감 많은 순, 동률은 최신순).
- **삭제** — 글 카드의 `×` 로 삭제.
- **DB 저장** — 모든 글/공감 수는 PostgreSQL에 저장(로컬 PGlite ↔ 운영 Supabase 자동 전환).

## 🚀 실행 방법

```bash
npm install
npm start
# → http://localhost:3005
```

별도 설정 없이 바로 실행됩니다. 데이터는 임베디드 PostgreSQL(PGlite)의 `./data`에 저장됩니다.

## 🐘 Supabase에 저장하기

테이블은 첫 연결 시 `CREATE TABLE IF NOT EXISTS`로 자동 생성됩니다(수동 SQL 불필요).

1. Supabase 대시보드 → **Project Settings → Database → Connection string(URI)** 복사.
2. 이 폴더에 `.env` 파일을 만들고 추가:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
3. `npm start` — 콘솔에 `🐘 PostgreSQL(Supabase / DATABASE_URL) 연결됨`이 보이면 성공.

> 코드 변경 없이 `.env`의 `DATABASE_URL` 하나로 로컬 PGlite ↔ Supabase가 전환됩니다. (`db.js` 참고)

## 🔌 REST API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/posts?board=&sort=` | 글 목록 조회 · `board=worry\|praise` · `sort=new\|old\|likes` |
| POST | `/api/posts` | 익명 글 작성 `{ board, content, nickname? }` |
| POST | `/api/posts/:id/like` | 공감 토글 `{ delta: 1 \| -1 }` (0 미만 방지) |
| DELETE | `/api/posts/:id` | 글 삭제 |

## 🗂 데이터베이스 스키마

```sql
-- 하나의 테이블로 두 게시판을 모두 다룹니다 (board 컬럼으로 구분).
CREATE TABLE posts (
  id          SERIAL PRIMARY KEY,
  board       TEXT NOT NULL DEFAULT 'worry',  -- 'worry'(고민) | 'praise'(칭찬)
  content     TEXT NOT NULL,                  -- 글 내용
  nickname    TEXT NOT NULL DEFAULT '익명',    -- 표시용 익명 닉네임
  likes       INTEGER NOT NULL DEFAULT 0,     -- 공감 수 (0 이상)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🛠 기술 스택

- **프런트엔드** — React 18 + Tailwind (CDN, 단일 `index.html`)
  - **디자인** — 다크 + 무지갯빛 글로우 그라데이션(글래스모피즘): 보라·핑크·코랄·앰버 노을빛, 필름 그레인, Outfit·Noto Sans KR 폰트, 게시판별 글로우 전환
- **백엔드** — Node.js + Express 5 (REST API)
- **데이터베이스** — PostgreSQL · 로컬 PGlite / 운영 Supabase
- **배포** — Vercel (`vercel.json`)

## 📁 파일 구성

```
04_kindboard/
├── index.html      # React + Tailwind 프런트엔드 (다크/글로우 그라데이션 디자인)
├── server.js       # Express REST API (글쓰기·공감·정렬·삭제)
├── db.js           # PostgreSQL 모듈 (PGlite / Supabase 자동 전환)
├── package.json
├── vercel.json
├── .env.example    # DATABASE_URL 예시
└── README.md
```
