import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// --- DB 연결 (pg / node-postgres) ---
// DATABASE_URL 이 있으면 우선 사용, 없으면 개별 환경변수로 연결.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'memo_app',
    });

// 시작 시 memos 테이블 보장
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memos (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('✅ memos 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 목록 조회 + 검색: GET /api/memos?search=키워드
app.get('/api/memos', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    let result;
    if (search) {
      result = await pool.query(
        `SELECT id, title, content, created_at
           FROM memos
          WHERE title ILIKE $1 OR content ILIKE $1
          ORDER BY created_at DESC`,
        [`%${search}%`]
      );
    } else {
      result = await pool.query(
        `SELECT id, title, content, created_at
           FROM memos
          ORDER BY created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '메모 조회 실패', detail: err.message });
  }
});

// 단건 조회: GET /api/memos/:id
app.get('/api/memos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, content, created_at FROM memos WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '메모 없음' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '조회 실패', detail: err.message });
  }
});

// 생성: POST /api/memos
app.post('/api/memos', async (req, res) => {
  try {
    const { title = '', content = '' } = req.body || {};
    if (!title.trim() && !content.trim()) {
      return res.status(400).json({ error: '제목이나 내용 중 하나는 필요합니다' });
    }
    const result = await pool.query(
      `INSERT INTO memos (title, content)
       VALUES ($1, $2)
       RETURNING id, title, content, created_at`,
      [title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '메모 저장 실패', detail: err.message });
  }
});

// 수정: PUT /api/memos/:id
app.put('/api/memos/:id', async (req, res) => {
  try {
    const { title = '', content = '' } = req.body || {};
    const result = await pool.query(
      `UPDATE memos
          SET title = $1, content = $2
        WHERE id = $3
        RETURNING id, title, content, created_at`,
      [title, content, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '메모 없음' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '메모 수정 실패', detail: err.message });
  }
});

// 삭제: DELETE /api/memos/:id
app.delete('/api/memos/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM memos WHERE id = $1 RETURNING id`, [
      req.params.id,
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: '메모 없음' });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT} 에서 실행 중`));
  })
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   PostgreSQL 가 실행 중인지, .env 설정이 맞는지 확인하세요.');
    process.exit(1);
  });
