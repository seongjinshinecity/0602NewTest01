// ============================================================
// 익명 게시판(고민·칭찬) — Express 서버 (REST API)
// ------------------------------------------------------------
//  · 익명으로 글 작성 (고민 게시판 / 칭찬 게시판)
//  · 다른 사람이 글에 "공감" 버튼을 눌러 공감 수 증가/취소
//  · 최신순 / 오래된순(시간순) / 공감순 정렬 조회
//  · 모든 글은 DB(PostgreSQL: PGlite/Supabase)에 저장됩니다.
// ============================================================

try { process.loadEnvFile(); } catch { /* .env 없음 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 입력 정리
function clean(raw, max = 500) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > max ? s.slice(0, max) : s;
}

// 게시판 종류 정규화: 'worry'(고민) | 'praise'(칭찬)
function normalizeBoard(raw) {
  return raw === 'praise' ? 'praise' : 'worry';
}

// 정렬 기준 → SQL ORDER BY 절
//   new   : 최신순 (작성 시간 내림차순)
//   old   : 시간순/오래된순 (작성 시간 오름차순)
//   likes : 공감순 (공감 많은 순, 동률이면 최신순)
function orderBy(sort) {
  if (sort === 'old') return 'created_at ASC, id ASC';
  if (sort === 'likes') return 'likes DESC, created_at DESC';
  return 'created_at DESC, id DESC'; // 기본 = 최신순
}

function rowToPost(r) {
  return {
    id: r.id,
    board: r.board,
    content: r.content,
    nickname: r.nickname,
    likes: r.likes,
    created_at: r.created_at,
  };
}

// ============================================================
//  글 목록 조회 — ?board=worry|praise & ?sort=new|old|likes
// ============================================================
app.get('/api/posts', async (req, res) => {
  const board = normalizeBoard(req.query.board);
  const sort = ['new', 'old', 'likes'].includes(req.query.sort) ? req.query.sort : 'new';
  try {
    const { rows } = await query(
      `SELECT id, board, content, nickname, likes, created_at
       FROM posts WHERE board = $1 ORDER BY ${orderBy(sort)}`,
      [board]
    );
    res.json({ success: true, data: rows.map(rowToPost) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '글을 불러오지 못했습니다.' });
  }
});

// ----- 글 작성 (익명) -----
app.post('/api/posts', async (req, res) => {
  const b = req.body || {};
  const board = normalizeBoard(b.board);
  const content = clean(b.content, 1000);
  if (!content) return res.status(400).json({ success: false, message: '내용을 입력해 주세요.' });
  const nickname = clean(b.nickname, 20) || '익명';

  try {
    const { rows } = await query(
      `INSERT INTO posts (board, content, nickname)
       VALUES ($1, $2, $3)
       RETURNING id, board, content, nickname, likes, created_at`,
      [board, content, nickname]
    );
    res.status(201).json({ success: true, data: rowToPost(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '글 저장에 실패했습니다.' });
  }
});

// ----- 공감 토글 (+1 / -1) -----
//   body: { delta: 1 | -1 }  · likes 는 0 미만으로 내려가지 않습니다.
app.post('/api/posts/:id/like', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 ID 입니다.' });
  const delta = req.body?.delta === -1 ? -1 : 1;
  try {
    const { rows } = await query(
      `UPDATE posts SET likes = GREATEST(0, likes + $1) WHERE id = $2
       RETURNING id, board, content, nickname, likes, created_at`,
      [delta, id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '글을 찾을 수 없습니다.' });
    res.json({ success: true, data: rowToPost(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '공감 처리에 실패했습니다.' });
  }
});

// ----- 글 삭제 -----
app.delete('/api/posts/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '글을 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '글 삭제에 실패했습니다.' });
  }
});

// ----- SPA fallback -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ 익명 게시판(고민·칭찬) 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
