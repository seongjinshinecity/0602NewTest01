// ============================================================
// 익명 게시판(고민·칭찬) — 데이터베이스 모듈 (PostgreSQL)
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
// 외부에는 동일한 query(sql, params) 인터페이스만 노출합니다.
// ============================================================

const path = require('path');

let _ready = null;

// 익명 글을 저장하는 테이블 하나로 두 게시판을 모두 다룹니다.
//   board   : 'worry'(고민) | 'praise'(칭찬)
//   content : 글 내용
//   nickname: 표시용 익명 닉네임 (기본 '익명')
//   likes   : 공감 수 (0 이상)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    board       TEXT NOT NULL DEFAULT 'worry',
    content     TEXT NOT NULL,
    nickname    TEXT NOT NULL DEFAULT '익명',
    likes       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
