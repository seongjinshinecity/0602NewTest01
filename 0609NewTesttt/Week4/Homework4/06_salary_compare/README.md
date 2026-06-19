# 💸 익명 연봉/지출 비교

월급·지출·직군·연차를 **익명으로** 제출하면, 전체 평균과 분포 속에서
**내 위치(상위 몇 %)** 와 **카테고리별 지출**을 한눈에 비교해 주는 웹앱입니다.

- 개인을 특정할 수 있는 정보(이름·이메일 등)는 **받지도, 저장하지도 않습니다.**
- 모든 제출은 PostgreSQL(로컬 PGlite / 운영 Supabase)에 익명 행으로만 쌓입니다.

## 화면

**① 입력 화면** — 직군·연차·월급·카테고리별 지출을 입력 (제출 전에도 현재 전체 평균 미리보기)

![입력 화면](screenshot-input.png)

**② 결과 화면** — 내 위치(상위 %), 월급 분포 히스토그램, 카테고리별 나 vs 평균 비교

![결과 화면](screenshot-result.png)

## 주요 기능

| 기능 | 설명 |
|------|------|
| 익명 제출 | 직군 / 연차 / 월급 / 카테고리별 월 지출(식비·주거·교통·통신·구독료·여가·기타) |
| 내 위치 | 월급 기준 **상위 N%** (전체 / 같은 직군 내 토글) |
| 전체 통계 | 표본 수, 평균·중앙값 월급, 평균 지출, 평균 저축률 |
| 월급 분포 | 구간별 인원 히스토그램 — **내가 속한 구간 강조** |
| 카테고리 비교 | 카테고리별 **내 지출 vs 평균** 막대그래프 + 평균比 카드 |
| 저축률 | (월급 − 총지출) / 월급, 입력 중 실시간 미리보기 |

## 기술 스택

- **프런트엔드** — React 18 + Tailwind CSS + Chart.js (CDN, 단일 `index.html`, 빌드 불필요)
- **백엔드** — Node.js + Express (REST API)
- **DB** — PostgreSQL
  - 로컬: **PGlite**(임베디드, 설치 불필요 · `./data`에 영속)
  - 운영: **Supabase** — `.env`에 `DATABASE_URL`만 넣으면 자동 전환

## 실행 방법

```bash
npm install
npm start
# → http://localhost:3007
```

### Supabase로 저장하기 (선택)

1. Supabase 대시보드 → **Project Settings → Database → Connection string(URI)** 복사
2. `.env.example`를 `.env`로 복사한 뒤 값 입력:
   ```env
   DATABASE_URL=postgresql://postgres:비밀번호@db.xxxx.supabase.co:5432/postgres
   ```
3. `npm start` — 테이블(`submissions`)은 `CREATE TABLE IF NOT EXISTS`로 자동 생성됩니다.

> `DATABASE_URL`이 없으면 자동으로 PGlite(`./data`)를 사용하므로, Supabase 없이도 바로 동작합니다.

## 저장되는 데이터 (익명)

`submissions` 테이블 한 행 = 제출 1건. **개인 식별 컬럼 없음.**

| 컬럼 | 의미 |
|------|------|
| `job` | 직군 (dev / design / pm / marketing / sales / etc) |
| `years` | 연차(년) |
| `salary` | 월급 (만원) |
| `exp_food` `exp_housing` `exp_transport` `exp_telecom` `exp_subscription` `exp_leisure` `exp_etc` | 카테고리별 월 지출 (만원) |
| `created_at` | 제출 시각 |

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET`  | `/api/stats?job=dev` | 전체(또는 직군별) 통계 — 평균·중앙값·분포·카테고리 평균·저축률 |
| `POST` | `/api/submissions` | 익명 제출 → 저장 후 전체 통계 + **내 위치(상위 %)** 반환 |

`POST /api/submissions` 요청 예시:

```json
{
  "job": "dev", "years": 4, "salary": 500,
  "food": 70, "housing": 80, "transport": 16,
  "telecom": 8, "subscription": 6, "leisure": 35, "etc": 20
}
```

> 금액 단위는 모두 **만원**입니다.
