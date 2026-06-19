// ============================================================
// 실시간 밸런스 게임 — 데이터베이스 모듈 (PostgreSQL)
// ------------------------------------------------------------
// 기본: PGlite — 실제 PostgreSQL을 WASM로 컴파일한 임베디드 엔진.
//        ./data 디렉터리에 영속화되어 앱을 껐다 켜도 데이터가 유지됩니다.
//        (별도 DB 서버/설치 불필요, npm install 만으로 동작)
//
// Supabase(외부 PostgreSQL) 로 바꾸려면:
//   1) Supabase 대시보드 → Project Settings → Database → Connection string(URI) 복사
//   2) .env 에 DATABASE_URL=postgresql://...  형태로 저장
//   3) npm start — 테이블은 CREATE TABLE IF NOT EXISTS 로 자동 생성됩니다.
//
// 외부에는 동일한 query(sql, params) 인터페이스만 노출합니다.
// ============================================================

const path = require('path');

let _ready = null;

// 밸런스 게임 질문 한 개 = 한 행.
//   option_a / option_b : 두 선택지 텍스트
//   votes_a  / votes_b  : 각 선택지 득표 수 (0 이상)
//   총 참여자 수 = votes_a + votes_b
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS balance_questions (
    id          SERIAL PRIMARY KEY,
    option_a    TEXT NOT NULL,
    option_b    TEXT NOT NULL,
    category    TEXT,
    votes_a     INTEGER NOT NULL DEFAULT 0,
    votes_b     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // 기존 테이블에도 category 컬럼 보강 (이미 있으면 무시)
  `ALTER TABLE balance_questions ADD COLUMN IF NOT EXISTS category TEXT`,
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
