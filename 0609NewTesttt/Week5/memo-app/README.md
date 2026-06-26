# 📝 메모장 앱 (PostgreSQL + Express + CDN React)

PostgreSQL DB에 메모를 저장/조회/수정/삭제/검색하는 풀스택 메모장 앱입니다.

- **백엔드**: Node.js + Express + `pg` (node-postgres) → PostgreSQL 연결
- **프론트엔드**: 단일 `public/index.html` (빌드 도구 없는 CDN React 18 + Tailwind)

## 구조

```
memo-app/
├── server.js            # Express API 서버 + pg 연결 + memos 테이블 자동 생성
├── package.json
├── .env.example         # 복사해서 .env 로 쓰세요
└── public/
    └── index.html       # 프론트엔드 (서버가 정적으로 서빙)
```

## DB 스키마

서버 시작 시 `memos` 테이블이 없으면 자동 생성합니다.

| 컬럼        | 타입          | 설명               |
|-------------|---------------|--------------------|
| id          | SERIAL PK     | 메모 고유 번호     |
| title       | TEXT          | 제목               |
| content     | TEXT          | 내용               |
| created_at  | TIMESTAMPTZ   | 작성 시각 (기본값 now()) |

## 실행 방법

1. **PostgreSQL 준비** — 로컬에 PostgreSQL이 실행 중이어야 합니다. DB를 미리 만들어 두세요:
   ```bash
   createdb memo_app          # 또는 psql 에서 CREATE DATABASE memo_app;
   ```
2. **환경변수 설정**
   ```bash
   cp .env.example .env       # 접속 정보(host/user/password 등)를 본인 환경에 맞게 수정
   ```
3. **의존성 설치 & 실행**
   ```bash
   npm install
   npm start                  # 또는 npm run dev (파일 변경 시 자동 재시작)
   ```
4. 브라우저에서 **http://localhost:3000** 접속.

> ⚠️ `public/index.html`을 파일로 직접 열거나 별도 정적 서버로 열면 `/api` 요청이 404가 납니다.
> 반드시 위 Express 서버 주소(3000번)로 접속하세요 — 같은 출처라야 API가 동작합니다.

## API 엔드포인트

| 메서드 | 경로                      | 설명                         |
|--------|---------------------------|------------------------------|
| GET    | `/api/memos?search=키워드` | 목록 조회 / 검색 (title·content ILIKE) |
| GET    | `/api/memos/:id`          | 단건 조회                    |
| POST   | `/api/memos`              | 생성 `{ title, content }`    |
| PUT    | `/api/memos/:id`          | 수정 `{ title, content }`    |
| DELETE | `/api/memos/:id`          | 삭제                         |

## Network 탭 확인

개발자도구(F12) → **Network** 탭을 열고 메모를 저장/검색해 보세요.
- 저장 시 `POST /api/memos`
- 검색·새로고침 시 `GET /api/memos`
- 수정 시 `PUT /api/memos/:id`

요청이 `fetch`로 명확히 잡히고, 응답 JSON을 확인할 수 있습니다.
