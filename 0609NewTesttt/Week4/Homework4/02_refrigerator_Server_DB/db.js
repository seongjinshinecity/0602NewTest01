// ============================================================
// 냉장고 재료 & 레시피 앱 — 데이터베이스 모듈 (PostgreSQL)
// ------------------------------------------------------------
// 기본: PGlite — 실제 PostgreSQL을 WASM로 컴파일한 임베디드 엔진.
//        ./data 디렉터리에 영속화되어 앱을 껐다 켜도 데이터가 유지됩니다.
//        (별도 DB 서버/설치 불필요, npm install 만으로 동작)
//
// Supabase(외부 PostgreSQL) 로 바꾸려면:
//   1) Supabase 대시보드 → Project Settings → Database → Connection string
//      → "URI" (또는 Connection pooling) 값을 복사
//   2) 이 폴더에 .env 파일을 만들고 아래 한 줄을 넣으세요:
//        DATABASE_URL=postgresql://postgres:비밀번호@db.xxxx.supabase.co:5432/postgres
//   3) npm start — 아래 query() 가 자동으로 node-postgres(pg.Pool) 를 사용하며,
//      CREATE TABLE IF NOT EXISTS 로 테이블이 자동 생성됩니다(수동 SQL 불필요).
//
// 어떤 엔진이든 외부에는 동일한 query(sql, params) 인터페이스만 노출합니다.
// ============================================================

const path = require('path');

let _ready = null; // 초기화(테이블 생성)까지 끝낸 query 함수에 대한 Promise

// 두 개의 테이블: 냉장고 재료(ingredients) / 레시피(recipes)
// PGlite 의 query() 는 한 번에 한 문장만 받으므로 문장 단위 배열로 둡니다.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ingredients (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT '기타',
    quantity    TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id           SERIAL PRIMARY KEY,
    title        TEXT NOT NULL,
    ingredients  TEXT NOT NULL DEFAULT '',
    steps        TEXT NOT NULL DEFAULT '',
    source       TEXT NOT NULL DEFAULT 'manual',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

async function init() {
  // 환경변수에 trailing newline 이 붙는 경우가 있어 .trim() 적용
  const url = (process.env.DATABASE_URL || '').trim();
  if (url) {
    // ----- 외부 PostgreSQL (node-postgres) · 예: Supabase -----
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false }, // Supabase 등 관리형 PG는 SSL 필요
    });
    const query = (sql, params = []) => pool.query(sql, params);
    for (const stmt of SCHEMA) await query(stmt);
    const host = url.replace(/^.*@/, '').replace(/\/.*$/, '');
    console.log(`🐘 PostgreSQL(Supabase / DATABASE_URL) 연결됨 · ${host}`);
    return query;
  }

  // ----- 임베디드 PostgreSQL (PGlite) · 로컬 개발 전용 -----
  // 동적 require: Vercel 번들러가 대용량 wasm 을 정적으로 묶지 않도록 함
  const pglitePkg = '@electric-sql/pglite';
  const { PGlite } = require(pglitePkg);
  const dataDir = path.join(__dirname, 'data');
  const pg = new PGlite(dataDir);
  const query = (sql, params = []) => pg.query(sql, params);
  for (const stmt of SCHEMA) await query(stmt);
  console.log(`🐘 PGlite(임베디드 PostgreSQL) 준비됨 · 저장 위치: ${dataDir}`);
  return query;
}

// 어디서 호출해도 단 한 번만 초기화하고, 그 결과(query 함수)를 재사용합니다.
function getDb() {
  if (!_ready) _ready = init();
  return _ready;
}

// 외부 공개 인터페이스: query(sql, params) → { rows }
async function query(sql, params = []) {
  const q = await getDb();
  return q(sql, params);
}

module.exports = { query };
