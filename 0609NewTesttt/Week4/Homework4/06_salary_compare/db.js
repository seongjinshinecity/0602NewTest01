// ============================================================
// 익명 연봉/지출 비교 — 데이터베이스 모듈 (PostgreSQL)
// ------------------------------------------------------------
// 기본: PGlite — 실제 PostgreSQL을 WASM로 컴파일한 임베디드 엔진.
//        ./data 디렉터리에 영속화되어 앱을 껐다 켜도 데이터가 유지됩니다.
//        (별도 DB 서버/설치 불필요, npm install 만으로 동작)
//
// Supabase(외부 PostgreSQL) 로 바꾸려면:
//   1) Supabase 대시보드 → Project Settings → Database → Connection string(URI) 복사
//   2) .env 에 DATABASE_URL=postgresql://postgres:비밀번호@db.xxxx.supabase.co:5432/postgres
//   3) npm start — 테이블은 CREATE TABLE IF NOT EXISTS 로 자동 생성됩니다.
//
// 모든 행은 개인 식별 정보 없이 익명으로만 저장됩니다.
// 외부에는 동일한 query(sql, params) 인터페이스만 노출합니다.
// ============================================================

const path = require('path');

let _ready = null;

// 익명 제출 1건 = 1행. 개인을 특정할 수 있는 컬럼은 두지 않습니다.
//   job     : 직군 (dev/design/pm/marketing/sales/etc)
//   years   : 연차(년)
//   salary  : 월급 (만원 단위 정수)
//   exp_*   : 카테고리별 월 지출 (만원 단위 정수)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS submissions (
    id               SERIAL PRIMARY KEY,
    job              TEXT    NOT NULL DEFAULT 'etc',
    years            INTEGER NOT NULL DEFAULT 0,
    salary           INTEGER NOT NULL,
    exp_food         INTEGER NOT NULL DEFAULT 0,
    exp_housing      INTEGER NOT NULL DEFAULT 0,
    exp_transport    INTEGER NOT NULL DEFAULT 0,
    exp_telecom      INTEGER NOT NULL DEFAULT 0,
    exp_subscription INTEGER NOT NULL DEFAULT 0,
    exp_leisure      INTEGER NOT NULL DEFAULT 0,
    exp_etc          INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

async function init() {
  const url = (process.env.DATABASE_URL || '').trim();
  if (url) {
    // ----- 외부 PostgreSQL (node-postgres) · 예: Supabase -----
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
    const query = (sql, params = []) => pool.query(sql, params);
    for (const stmt of SCHEMA) await query(stmt);
    const host = url.replace(/^.*@/, '').replace(/\/.*$/, '');
    console.log(`🐘 PostgreSQL(Supabase / DATABASE_URL) 연결됨 · ${host}`);
    return query;
  }

  // ----- 임베디드 PostgreSQL (PGlite) · 로컬 개발 전용 -----
  const pglitePkg = '@electric-sql/pglite';
  const { PGlite } = require(pglitePkg);
  const dataDir = path.join(__dirname, 'data');
  const pg = new PGlite(dataDir);
  const query = (sql, params = []) => pg.query(sql, params);
  for (const stmt of SCHEMA) await query(stmt);
  console.log(`🐘 PGlite(임베디드 PostgreSQL) 준비됨 · 저장 위치: ${dataDir}`);
  return query;
}

function getDb() {
  if (!_ready) _ready = init();
  return _ready;
}

async function query(sql, params = []) {
  const q = await getDb();
  return q(sql, params);
}

module.exports = { query };
