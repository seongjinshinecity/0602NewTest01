# 🎯 실시간 밸런스 게임 (NewbalanceGm)

둘 중 하나만 고르는 **실시간 밸런스 게임** 웹앱입니다. 상단 탭으로 두 가지 모드를 즐길 수 있어요.

- **🗳 실시간 투표** — 밸런스 질문(A vs B)을 등록하고 투표하면 **퍼센티지가 실시간으로** 바뀝니다. 선택지별 득표 수와 **총 참여자 수**를 한눈에 볼 수 있습니다.
- **🏆 토너먼트(음식 이상형 월드컵)** — 음식 항목들을 8/16/32강으로 맞붙여 이긴 쪽이 진출, 최후의 1개를 가립니다. 우승·승률 통계가 **명예의 전당**에 실시간 누적됩니다.

모든 데이터는 **PostgreSQL(Supabase)** 에 저장됩니다.

기본 문항으로 **음식 밸런스 게임(`Food Balance.json`) 100문항**이 5개 카테고리로 들어가 있고,
상단 탭으로 카테고리별로 골라볼 수 있습니다.

| 카테고리 | 설명 | 문항 |
|---|---|---|
| 🍚 한식 | 한식 & 식사 취향 | 20 |
| 🍰 간식·디저트 | 간식 & 디저트 & 야식 | 20 |
| 🌶 극한 선택 | 평생 하나만 먹기 | 20 |
| 🍴 식습관 | 먹방 & 식습관 | 20 |
| 🌍 세계 요리 | 양식 & 일식 & 중식 & 세계 요리 | 20 |

디자인은 강렬한 3D 기하 도형이 떠다니는 포스터 무드(굵은 산세리프 + 하프톤 점 텍스처 + 입체 그림자)를 참고했습니다.

---

## 📸 미리보기

**🗳 실시간 투표**

| 투표 전 (선택지) | 투표 후 (실시간 결과) |
|---|---|
| ![투표 화면](screenshot.png) | ![결과 화면](screenshot-result.png) |

**🏆 토너먼트 (음식 이상형 월드컵)**

| 시작 화면 + 명예의 전당 | 대결 화면 | 우승 화면 |
|---|---|---|
| ![토너먼트 시작](screenshot-tournament.png) | ![토너먼트 대결](screenshot-tournament-match.png) | ![토너먼트 우승](screenshot-tournament-win.png) |

---

## ✨ 기능

- **카테고리 탭** — 전체 / 한식 / 간식·디저트 / 극한 선택 / 식습관 / 세계 요리로 문항을 필터링합니다.
- **질문 등록** — 선택지 A vs B 두 개와 카테고리를 골라 새 밸런스 질문을 올립니다.
- **투표** — 둘 중 하나를 클릭하면 즉시 한 표가 반영됩니다 (낙관적 업데이트).
- **실시간 퍼센티지** — 2.5초마다 자동 폴링하여 다른 사람의 투표까지 반영된 비율이 갱신됩니다.
- **결과 표시** — 선택지별 퍼센티지·득표 수, 그리고 질문별 / 전체 **총 참여자 수**를 보여줍니다.
- **내 선택 표시(MY PICK)** — 브라우저에 기억해 중복 투표를 막고 내가 고른 쪽을 강조합니다.
- **질문 삭제** — 필요 없는 질문은 삭제할 수 있습니다.
- **🏆 토너먼트 모드** — 음식 항목을 8/16/32강 싱글 엘리미네이션으로 진행해 우승을 가립니다. 라운드(16강→8강→…→결승) 진행바와 함께 한 경기씩 선택합니다.
- **명예의 전당** — 우승 횟수·매치 승률 랭킹을 Supabase에 누적해 실시간으로 보여줍니다.
- **DB 저장** — 질문·득표 수와 토너먼트 통계가 모두 PostgreSQL(Supabase)에 영속 저장됩니다.

---

## 🔄 앱 구조 / 데이터 흐름

```
[질문 등록 A vs B]                      [투표 선택]
  POST /api/questions                    클릭 → 즉시 화면 반영(낙관적 업데이트)
       │                                      │
       ▼                                      ▼
   [Server: server.js]                  POST /api/questions/:id/vote { choice }
   INSERT balance_questions                   │
   (votes_a=0, votes_b=0)                      ▼
       │                              [Server] UPDATE ... SET votes_a/b = +1
       ▼                                      │
   ┌─────────── DB (Supabase PostgreSQL) ─────────┐
   │  balance_questions 테이블에 영속 저장          │
   └──────────────────────────────────────────────┘
       │
       ▼
   [투표율 계산 = 서버에서]  rowToQuestion()
   percentA = round(votesA / total × 100), percentB = 100 - percentA
       │
       ▼
   GET /api/questions  ← 클라이언트가 2.5초마다 폴링
       │
       ▼
   [퍼센티지 바 업데이트]  style width: `${percent}%`
```

골격은 **질문 등록(A vs B) → 투표 선택 → Server → DB 저장 → 실시간 투표율 계산 → 퍼센티지 바 업데이트** 입니다. 두 가지 디테일이 포인트예요.

1. **투표율 계산은 "서버에서"** — 클라이언트가 아니라 `server.js`의 `rowToQuestion()`이 DB의 `votes_a`/`votes_b`를 읽어 `percentA`/`percentB`를 계산해 내려줍니다. 합이 항상 100이 되도록 `percentB = 100 - percentA`로 처리합니다.
2. **"실시간"은 2.5초 폴링 + 낙관적 업데이트** — WebSocket 푸시가 아니라 클라이언트가 `setInterval`로 2.5초마다 `GET /api/questions`를 다시 불러와 *다른 사람*의 투표까지 반영합니다. 단, **내가 투표한 순간**엔 서버 응답을 기다리지 않고 화면을 먼저 갱신(낙관적 업데이트)한 뒤 서버에 반영하고, 다음 폴링에서 정합성을 맞춥니다. 또한 `localStorage`로 내 선택을 기억해 **중복 투표 방지 + MY PICK 표시**를 합니다.

> 🏆 **토너먼트 모드**는 흐름이 조금 다릅니다 — 매 매치는 브라우저에서 진행하고, **우승이 확정되는 순간 한 번** `POST /api/tournament/result`로 전체 결과(우승자 + 매치 목록)를 보내 `tournament_stats`에 누적합니다(매 클릭마다 저장하지 않고 완료 시 일괄 저장).

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
| `POST`   | `/api/questions`           | 질문 등록 `{ optionA, optionB, category? }` |
| `POST`   | `/api/questions/:id/vote`  | 투표 `{ choice: "a" \| "b" }` |
| `DELETE` | `/api/questions/:id`       | 질문 삭제 |
| `GET`    | `/api/tournament/items`    | 토너먼트 후보 항목(음식 카테고리 선택지) |
| `GET`    | `/api/tournament/ranking`  | 명예의 전당 — 우승 횟수·승률 랭킹 |
| `POST`   | `/api/tournament/result`   | 토너먼트 결과 저장 `{ champion, matches: [{winner, loser}] }` |

응답의 각 질문에는 `votesA`, `votesB`, `total`, `percentA`, `percentB`가 포함됩니다.

---

## 🗄 DB 스키마

```sql
CREATE TABLE IF NOT EXISTS balance_questions (
  id          SERIAL PRIMARY KEY,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  category    TEXT,
  votes_a     INTEGER NOT NULL DEFAULT 0,
  votes_b     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
-- 토너먼트(이상형 월드컵) 항목별 통계
CREATE TABLE IF NOT EXISTS tournament_stats (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  wins        INTEGER NOT NULL DEFAULT 0,   -- 토너먼트 우승 횟수
  picks       INTEGER NOT NULL DEFAULT 0,   -- 매치에서 선택(승리)된 횟수
  matches     INTEGER NOT NULL DEFAULT 0,   -- 매치 등장 횟수
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> 총 참여자 수 = `votes_a + votes_b` · 매치 승률 = `picks / matches`
