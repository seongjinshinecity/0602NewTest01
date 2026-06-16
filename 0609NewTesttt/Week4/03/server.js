// ============================================================
// 오늘 할 일 · Todo 서버
// 단일 server.js (Express) · 로컬 + Vercel 듀얼 모드
// 데이터 저장: Supabase PostgreSQL (pg)
// ============================================================

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_LEN = 120; // index.html 입력창의 maxLength와 동일

// ----- DB 연결 풀 (lazy: 첫 요청 때 생성) -----
let pool = null;
function getPool() {
  if (pool) return pool;
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

// ----- 테이블 초기화 (cold start 대응: flag로 1회만) -----
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         BIGSERIAL PRIMARY KEY,
      text       TEXT        NOT NULL,
      done       BOOLEAN     NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  dbInitialized = true;
}

// DB row -> 클라이언트 형식으로 변환
function toTodo(row) {
  return {
    id: String(row.id),
    text: row.text,
    done: row.done,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ----- 미들웨어 -----
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API 라우트 진입 전에 테이블 보장
app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB 초기화 실패:', err.message);
    res.status(500).json({ success: false, message: '데이터베이스 초기화에 실패했습니다.' });
  }
});

// ----- API: 할 일 목록 (최신순) -----
app.get('/api/todos', async (_req, res) => {
  try {
    const { rows } = await getPool().query(
      'SELECT id, text, done, created_at FROM todos ORDER BY created_at DESC, id DESC'
    );
    res.json({ success: true, data: rows.map(toTodo) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '할 일을 불러오지 못했습니다.' });
  }
});

// ----- API: 할 일 추가 -----
app.post('/api/todos', async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, message: '할 일 내용을 입력해 주세요.' });
    }
    if (text.length > MAX_LEN) {
      return res.status(400).json({ success: false, message: `할 일은 ${MAX_LEN}자 이내로 입력해 주세요.` });
    }
    const { rows } = await getPool().query(
      'INSERT INTO todos (text) VALUES ($1) RETURNING id, text, done, created_at',
      [text]
    );
    res.status(201).json({ success: true, data: toTodo(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '할 일 저장에 실패했습니다.' });
  }
});

// ----- API: 완료한 항목 모두 삭제 (/:id 보다 먼저 선언) -----
app.delete('/api/todos/completed', async (_req, res) => {
  try {
    const { rowCount } = await getPool().query('DELETE FROM todos WHERE done = true');
    res.json({ success: true, data: { deleted: rowCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '완료 항목 삭제에 실패했습니다.' });
  }
});

// ----- API: 완료 상태 변경 (토글) -----
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let done = req.body?.done;
    let result;
    if (typeof done === 'boolean') {
      // 명시적 값으로 설정
      result = await getPool().query(
        'UPDATE todos SET done = $1 WHERE id = $2 RETURNING id, text, done, created_at',
        [done, id]
      );
    } else {
      // 값이 없으면 현재 값을 반전
      result = await getPool().query(
        'UPDATE todos SET done = NOT done WHERE id = $1 RETURNING id, text, done, created_at',
        [id]
      );
    }
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '해당 할 일을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: toTodo(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '상태 변경에 실패했습니다.' });
  }
});

// ----- API: 할 일 삭제 -----
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { rowCount } = await getPool().query('DELETE FROM todos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: '해당 할 일을 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '삭제에 실패했습니다.' });
  }
});

// ----- SPA fallback (Express 4 catch-all) -----
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ----- 로컬: 서버 시작 / Vercel: app export -----
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}
module.exports = app;
