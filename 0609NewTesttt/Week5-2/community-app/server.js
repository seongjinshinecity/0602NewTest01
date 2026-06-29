import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../shared/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from '../shared/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 게시글 테이블 보장 (작성자 = app_users.id)
async function initDb() {
  await ensureAuthTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id         BIGSERIAL PRIMARY KEY,
      user_id    BIGINT      NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title      TEXT        NOT NULL,
      content    TEXT        NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts (created_at DESC);`);
  console.log('✅ community_posts 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

registerAuthRoutes(app);

function validatePost(body) {
  const title = String(body?.title || '').trim();
  const content = String(body?.content || '').trim();
  if (!title) return { error: '제목을 입력하세요' };
  if (title.length > 200) return { error: '제목은 200자 이하여야 합니다' };
  return { value: { title, content } };
}

// 목록: 최신순, 작성자명 포함 (로그인 없이 조회 가능)
app.get('/api/posts', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.id, p.title, p.content, p.user_id, u.display_name AS author,
              p.created_at, p.updated_at
         FROM community_posts p
         JOIN app_users u ON u.id = p.user_id
        ORDER BY p.created_at DESC, p.id DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '목록 조회 실패', detail: err.message });
  }
});

// 상세
app.get('/api/posts/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.id, p.title, p.content, p.user_id, u.display_name AS author,
              p.created_at, p.updated_at
         FROM community_posts p
         JOIN app_users u ON u.id = p.user_id
        WHERE p.id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: '게시글 없음' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '상세 조회 실패', detail: err.message });
  }
});

// 작성: 로그인 사용자만
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { error, value } = validatePost(req.body);
    if (error) return res.status(400).json({ error });
    const r = await pool.query(
      `INSERT INTO community_posts (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, user_id, created_at, updated_at`,
      [req.user.id, value.title, value.content]
    );
    res.status(201).json({ ...r.rows[0], author: req.user.display_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '작성 실패', detail: err.message });
  }
});

// 수정: 본인 글만 (WHERE user_id = 내 id 로 소유권 강제)
app.put('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const { error, value } = validatePost(req.body);
    if (error) return res.status(400).json({ error });
    const r = await pool.query(
      `UPDATE community_posts
          SET title = $1, content = $2, updated_at = now()
        WHERE id = $3 AND user_id = $4
        RETURNING id, title, content, user_id, created_at, updated_at`,
      [value.title, value.content, req.params.id, req.user.id]
    );
    if (!r.rows.length) {
      // 글이 없거나, 있어도 내 글이 아님
      const exists = await pool.query(`SELECT 1 FROM community_posts WHERE id = $1`, [req.params.id]);
      return res.status(exists.rows.length ? 403 : 404).json({
        error: exists.rows.length ? '본인 글만 수정할 수 있습니다' : '게시글 없음',
      });
    }
    res.json({ ...r.rows[0], author: req.user.display_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '수정 실패', detail: err.message });
  }
});

// 삭제: 본인 글만
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM community_posts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) {
      const exists = await pool.query(`SELECT 1 FROM community_posts WHERE id = $1`, [req.params.id]);
      return res.status(exists.rows.length ? 403 : 404).json({
        error: exists.rows.length ? '본인 글만 삭제할 수 있습니다' : '게시글 없음',
      });
    }
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '삭제 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3001;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 커뮤니티 http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   루트 .env 의 DATABASE_URL(Supabase) 을 확인하세요. (.env.example 참고)');
    process.exit(1);
  });
