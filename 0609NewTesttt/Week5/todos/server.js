import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// --- DB 연결 (pg / node-postgres) ---
// DATABASE_URL 은 Supabase pooler(pooler.supabase.com:6543) 이며 SSL 을 강제한다.
// 따라서 memo-app 과 달리 ssl 옵션이 반드시 필요하다.
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

const JWT_SECRET = (process.env.JWT_SECRET || '').trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();

// 시작 시 테이블 보장
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      done       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('✅ users / todos 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// 인증 미들웨어: Authorization: Bearer <token> 검증
// =====================================================================
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: '인증이 필요합니다' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// =====================================================================
// 인증 라우트 (토큰 불필요)
// =====================================================================

// 회원가입: POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || username.trim().length < 3 || password.length < 4) {
      return res.status(400).json({
        error: '아이디(3자 이상)와 비밀번호(4자 이상)를 입력하세요',
      });
    }
    const uname = username.trim();

    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [uname]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username`,
      [uname, password_hash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '회원가입 실패', detail: err.message });
  }
});

// 로그인: POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username.trim()]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }
    const token = signToken(row);
    res.json({ token, user: { id: row.id, username: row.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '로그인 실패', detail: err.message });
  }
});

// =====================================================================
// 할 일 라우트 (모두 인증 필요, 사용자별 스코프 강제)
// =====================================================================

// 목록 조회: GET /api/todos
app.get('/api/todos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, text, done, created_at
         FROM todos
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '할 일 조회 실패', detail: err.message });
  }
});

// 생성: POST /api/todos
app.post('/api/todos', auth, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '할 일 내용을 입력하세요' });
    }
    const result = await pool.query(
      `INSERT INTO todos (user_id, text)
       VALUES ($1, $2)
       RETURNING id, text, done, created_at`,
      [req.user.id, text.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '할 일 저장 실패', detail: err.message });
  }
});

// 수정: PUT /api/todos/:id  (text? done? 부분 수정)
app.put('/api/todos/:id', auth, async (req, res) => {
  try {
    const { text, done } = req.body || {};
    const result = await pool.query(
      `UPDATE todos
          SET text = COALESCE($1, text),
              done = COALESCE($2, done)
        WHERE user_id = $3 AND id = $4
        RETURNING id, text, done, created_at`,
      [
        text === undefined ? null : text,
        done === undefined ? null : done,
        req.user.id,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '할 일 없음' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '할 일 수정 실패', detail: err.message });
  }
});

// 삭제: DELETE /api/todos/:id
app.delete('/api/todos/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM todos WHERE user_id = $1 AND id = $2 RETURNING id`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '할 일 없음' });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '할 일 삭제 실패', detail: err.message });
  }
});

// =====================================================================
// AI: 목표 → 할 일 자동 생성  (POST /api/ai/suggest, 인증 필요)
// OpenAI 키는 서버에서만 사용하고 브라우저로 노출하지 않는다.
// =====================================================================
app.post('/api/ai/suggest', auth, async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI 기능이 설정되지 않았습니다 (OPENAI_API_KEY 없음)' });
    }
    const goal = (req.body?.goal || '').trim();
    if (!goal) return res.status(400).json({ error: '목표를 입력하세요' });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '너는 할 일 관리 도우미다. 사용자의 목표를 실행 가능한 구체적 할 일들로 쪼갠다. ' +
              '반드시 {"tasks": ["...", "..."]} 형태의 JSON 만 출력하라. ' +
              '각 항목은 한국어 한 문장의 짧은 행동(동사로 끝나도록), 3~6개로 제한한다.',
          },
          { role: 'user', content: `목표: ${goal}` },
        ],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error('OpenAI error', resp.status, detail);
      return res.status(502).json({ error: 'AI 호출 실패', detail: `OpenAI ${resp.status}` });
    }

    const data = await resp.json();
    let tasks = [];
    try {
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      if (Array.isArray(parsed.tasks)) tasks = parsed.tasks;
    } catch {
      /* 무시하고 빈 배열 반환 */
    }
    tasks = tasks.map((t) => String(t).trim()).filter(Boolean).slice(0, 6);
    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI 추천 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT} 에서 실행 중`));
  })
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   DATABASE_URL(Supabase) 과 JWT_SECRET 설정이 맞는지 확인하세요.');
    process.exit(1);
  });
