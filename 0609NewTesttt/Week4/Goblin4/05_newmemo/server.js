// ============================================================
// 메모 앱 — Express 서버 (REST API)
// 메모 작성 / 목록 조회 / 수정 / 삭제 (CRUD)
// 모든 데이터는 PostgreSQL(PGlite)에 저장되어 재시작해도 유지됩니다.
// ============================================================

// .env 가 있으면 로드 (DATABASE_URL 등). 없으면 PGlite 로 동작.
try { process.loadEnvFile(); } catch { /* .env 없음 → PGlite 사용 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;
const MAX_LEN = 1000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// content 검증 → 통과 시 정제된 문자열 반환, 실패 시 에러 메시지 반환
function validateContent(raw) {
  const content = typeof raw === 'string' ? raw.trim() : '';
  if (!content) return { error: '메모 내용을 입력해 주세요.' };
  if (content.length > MAX_LEN) return { error: `메모는 ${MAX_LEN}자 이내로 입력해 주세요.` };
  return { content };
}

// ----- 목록 조회 (최신순) -----
app.get('/api/memos', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, content, created_at, updated_at FROM memos ORDER BY updated_at DESC, id DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '메모를 불러오지 못했습니다.' });
  }
});

// ----- 작성 -----
app.post('/api/memos', async (req, res) => {
  const { content, error } = validateContent(req.body?.content);
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const { rows } = await query(
      'INSERT INTO memos (content) VALUES ($1) RETURNING id, content, created_at, updated_at',
      [content]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '메모 저장에 실패했습니다.' });
  }
});

// ----- 수정 -----
app.put('/api/memos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 메모 ID 입니다.' });

  const { content, error } = validateContent(req.body?.content);
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const { rows } = await query(
      'UPDATE memos SET content = $1, updated_at = now() WHERE id = $2 RETURNING id, content, created_at, updated_at',
      [content, id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '메모를 찾을 수 없습니다.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '메모 수정에 실패했습니다.' });
  }
});

// ----- 삭제 -----
app.delete('/api/memos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 메모 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM memos WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '메모를 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '메모 삭제에 실패했습니다.' });
  }
});

// ----- SPA fallback (Express 5: 와일드카드 경로 대신 미들웨어 사용) -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬: 서버 시작 / Vercel 서버리스: app export (require.main 가드)
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ 메모 앱 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
