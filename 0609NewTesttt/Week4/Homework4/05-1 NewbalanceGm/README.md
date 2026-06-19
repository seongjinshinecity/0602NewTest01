# 🎯 실시간 밸런스 게임 (NewbalanceGm)

둘 중 하나만 고르는 **실시간 밸런스 게임** 웹앱입니다.
누구나 밸런스 질문(A vs B)을 등록하고, 둘 중 하나에 투표하면 **퍼센티지가 실시간으로** 바뀌며,
선택지별 득표 수와 **총 참여자 수**를 한눈에 볼 수 있습니다.
모든 데이터는 **PostgreSQL(Supabase)** 에 저장됩니다.

디자인은 강렬한 3D 기하 도형이 떠다니는 포스터 무드(굵은 산세리프 + 하프톤 점 텍스처 + 입체 그림자)를 참고했습니다.

---

## 📸 미리보기

| 투표 전 (선택지) | 투표 후 (실시간 결과) |
|---|---|
| ![투표 화면](screenshot.png) | ![결과 화면](screenshot-result.png) |

---

## ✨ 기능

- **질문 등록** — 선택지 A vs B 두 개를 입력해 새 밸런스 질문을 올립니다.
- **투표** — 둘 중 하나를 클릭하면 즉시 한 표가 반영됩니다 (낙관적 업데이트).
- **실시간 퍼센티지** — 2.5초마다 자동 폴링하여 다른 사람의 투표까지 반영된 비율이 갱신됩니다.
- **결과 표시** — 선택지별 퍼센티지·득표 수, 그리고 질문별 / 전체 **총 참여자 수**를 보여줍니다.
- **내 선택 표시(MY PICK)** — 브라우저에 기억해 중복 투표를 막고 내가 고른 쪽을 강조합니다.
- **질문 삭제** — 필요 없는 질문은 삭제할 수 있습니다.
- **DB 저장** — 모든 질문과 득표 수가 PostgreSQL(Supabase)에 영속 저장됩니다.

---

## 🛠 기술 스택

- **프런트엔드** : React 18 + Tailwind CSS (CDN, 빌드 도구 없는 단일 `index.html`)
- **백엔드** : Node.js + Express (REST API)
- **데이터베이스** : PostgreSQL
  - 기본은 외부 **Supabase**(`DATABASE_URL`) 연결
  - `DATABASE_URL` 이 없으면 임베디드 **PGlite**(`./data`)로 자동 동작 (설치 불필요)

---

## 🚀 실행 방법

```bash
npm install
npm start
# → http://localhost:3006
```

### 데이터베이스 설정

`.env` 파일에 Supabase 연결 문자열을 넣으면 외부 PostgreSQL에 저장됩니다.

```env
DATABASE_URL=postgresql://postgres.xxxx:비밀번호@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

테이블(`balance_questions`)은 서버 시작 시 `CREATE TABLE IF NOT EXISTS`로 자동 생성됩니다.

---

## 📡 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`    | `/api/questions`           | 질문 목록(최신순) + 전체 총 참여자 수 |
| `POST`   | `/api/questions`           | 질문 등록 `{ optionA, optionB }` |
| `POST`   | `/api/questions/:id/vote`  | 투표 `{ choice: "a" \| "b" }` |
| `DELETE` | `/api/questions/:id`       | 질문 삭제 |

응답의 각 질문에는 `votesA`, `votesB`, `total`, `percentA`, `percentB`가 포함됩니다.

---

## 🗄 DB 스키마

```sql
CREATE TABLE IF NOT EXISTS balance_questions (
  id          SERIAL PRIMARY KEY,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  votes_a     INTEGER NOT NULL DEFAULT 0,
  votes_b     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> 총 참여자 수 = `votes_a + votes_b`
