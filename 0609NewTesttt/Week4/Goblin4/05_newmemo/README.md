# 📝 메모장 (React + Express + PostgreSQL)

메모를 **작성 · 목록 조회 · 수정 · 삭제(CRUD)** 할 수 있는 앱입니다.
모든 메모는 **PostgreSQL** 에 저장되어 앱을 껐다 켜도 그대로 유지됩니다.

## 실행 방법

```bash
cd Week4/05_newmemo
npm install
npm start
```

브라우저에서 **http://localhost:3002** 접속.

## 데이터는 어디에 저장되나요?

현재 이 프로젝트는 **Supabase PostgreSQL** 에 연결되어 있습니다.
접속 정보는 `.env` 의 `DATABASE_URL` 에 들어 있으며(`.gitignore` 처리되어
커밋되지 않음), `npm start` 시 `db.js` 가 이를 감지해 자동으로
node-postgres(`pg.Pool`, SSL)로 연결합니다.

```
.env
DATABASE_URL=postgresql://...@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### DB 엔진 전환 (자동)

`db.js` 는 `DATABASE_URL` 유무에 따라 엔진을 자동 선택합니다 — 앱 코드 변경 0:

| 조건 | 사용 엔진 | 저장 위치 |
|------|-----------|-----------|
| `.env` 에 `DATABASE_URL` 있음 | 외부 PostgreSQL (`pg`) | 원격 DB (예: Supabase) |
| `DATABASE_URL` 없음 | PGlite (임베디드 PG) | 로컬 `data/` 폴더 |

로컬 PGlite 로 되돌리려면 `.env` 를 지우거나 `DATABASE_URL` 을 비우면 됩니다.

## 구성

| 파일 | 역할 |
|------|------|
| `index.html` | React(CDN) + Tailwind 프론트엔드 (단일 파일) |
| `server.js`  | Express REST API (`/api/memos`) |
| `db.js`      | DB 접근 모듈 — `query(sql, params)` 한 인터페이스로 PGlite/pg 모두 지원 |

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/memos`      | 메모 목록 (최신순) |
| POST   | `/api/memos`      | 메모 작성 `{ content }` |
| PUT    | `/api/memos/:id`  | 메모 수정 `{ content }` |
| DELETE | `/api/memos/:id`  | 메모 삭제 |

모든 쿼리는 파라미터 바인딩(`$1, $2`)을 사용해 SQL 인젝션을 방지합니다.
