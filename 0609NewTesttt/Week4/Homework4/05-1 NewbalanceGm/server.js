// ============================================================
// 실시간 밸런스 게임 — Express 서버 (REST API)
// ------------------------------------------------------------
//  · 밸런스 게임 질문(선택지 A vs B) 등록
//  · 둘 중 하나에 투표 → 득표 수 +1
//  · 투표 결과(퍼센티지) · 선택지별 득표 · 총 참여자 수 조회
//  · 모든 데이터는 DB(PostgreSQL: PGlite/Supabase)에 저장됩니다.
//  · 클라이언트가 짧은 주기로 폴링하여 "실시간"으로 퍼센티지가 갱신됩니다.
// ============================================================

try { process.loadEnvFile(); } catch { /* .env 없음 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 입력 정리
function clean(raw, max = 80) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > max ? s.slice(0, max) : s;
}

function rowToQuestion(r) {
  const votesA = Number(r.votes_a) || 0;
  const votesB = Number(r.votes_b) || 0;
  const total = votesA + votesB;
  return {
    id: r.id,
    optionA: r.option_a,
    optionB: r.option_b,
    category: r.category || null,
    votesA,
    votesB,
    total,
    // 소수점 없는 정수 퍼센트 (합이 100이 되도록 B는 100 - A 처리)
    percentA: total === 0 ? 0 : Math.round((votesA / total) * 100),
    percentB: total === 0 ? 0 : 100 - Math.round((votesA / total) * 100),
    created_at: r.created_at,
  };
}

// ============================================================
//  질문 목록 조회 (최신순) + 총 참여자 수
// ============================================================
app.get('/api/questions', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, option_a, option_b, category, votes_a, votes_b, created_at
       FROM balance_questions ORDER BY id ASC`
    );
    const data = rows.map(rowToQuestion);
    const totalParticipants = data.reduce((sum, q) => sum + q.total, 0);
    res.json({ success: true, data, totalParticipants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '질문을 불러오지 못했습니다.' });
  }
});

// ----- 질문 등록 -----
app.post('/api/questions', async (req, res) => {
  const b = req.body || {};
  const optionA = clean(b.optionA);
  const optionB = clean(b.optionB);
  const category = clean(b.category, 40) || null;
  if (!optionA || !optionB) {
    return res.status(400).json({ success: false, message: '두 선택지를 모두 입력해 주세요.' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO balance_questions (option_a, option_b, category)
       VALUES ($1, $2, $3)
       RETURNING id, option_a, option_b, category, votes_a, votes_b, created_at`,
      [optionA, optionB, category]
    );
    res.status(201).json({ success: true, data: rowToQuestion(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '질문 저장에 실패했습니다.' });
  }
});

// ----- 투표 (choice: 'a' | 'b') -----
app.post('/api/questions/:id/vote', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 ID 입니다.' });
  const choice = req.body?.choice === 'b' ? 'b' : req.body?.choice === 'a' ? 'a' : null;
  if (!choice) return res.status(400).json({ success: false, message: '선택지를 골라 주세요.' });
  const col = choice === 'a' ? 'votes_a' : 'votes_b';
  try {
    const { rows } = await query(
      `UPDATE balance_questions SET ${col} = ${col} + 1 WHERE id = $1
       RETURNING id, option_a, option_b, category, votes_a, votes_b, created_at`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '질문을 찾을 수 없습니다.' });
    res.json({ success: true, data: rowToQuestion(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '투표 처리에 실패했습니다.' });
  }
});

// ----- 질문 삭제 -----
app.delete('/api/questions/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM balance_questions WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '질문을 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '질문 삭제에 실패했습니다.' });
  }
});

// ----- SPA fallback -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ 실시간 밸런스 게임 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
