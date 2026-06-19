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

// ============================================================
//  토너먼트(이상형 월드컵) API
// ============================================================

// 토너먼트 후보 항목 — 음식 항목이 명확한 카테고리의 선택지(중복 제거)
app.get('/api/tournament/items', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT option_a AS name FROM balance_questions
         WHERE category IN ('korean_food','snack_dessert','global_food')
       UNION
       SELECT DISTINCT option_b AS name FROM balance_questions
         WHERE category IN ('korean_food','snack_dessert','global_food')`
    );
    res.json({ success: true, data: rows.map(r => r.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '항목을 불러오지 못했습니다.' });
  }
});

// 우승 랭킹(명예의 전당) — 우승 횟수 → 선택 횟수 순
app.get('/api/tournament/ranking', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT name, wins, picks, matches FROM tournament_stats
       WHERE wins > 0 OR picks > 0
       ORDER BY wins DESC, picks DESC, matches DESC
       LIMIT 20`
    );
    const data = rows.map(r => {
      const matches = Number(r.matches) || 0;
      const picks = Number(r.picks) || 0;
      return {
        name: r.name,
        wins: Number(r.wins) || 0,
        picks, matches,
        winRate: matches === 0 ? 0 : Math.round((picks / matches) * 100),
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '랭킹을 불러오지 못했습니다.' });
  }
});

// 토너먼트 결과 저장 — { champion, matches: [{winner, loser}, ...] }
app.post('/api/tournament/result', async (req, res) => {
  const champion = clean(req.body?.champion, 80);
  const matches = Array.isArray(req.body?.matches) ? req.body.matches : [];
  if (!champion || matches.length === 0) {
    return res.status(400).json({ success: false, message: '토너먼트 결과가 올바르지 않습니다.' });
  }

  // 항목별 증분 집계: 승자=picks+1·matches+1, 패자=matches+1
  const agg = {};
  const bump = (name, k) => {
    const n = clean(name, 80);
    if (!n) return;
    agg[n] = agg[n] || { wins: 0, picks: 0, matches: 0 };
    agg[n][k] += 1;
  };
  for (const m of matches) {
    bump(m.winner, 'picks'); bump(m.winner, 'matches'); bump(m.loser, 'matches');
  }
  bump(champion, 'wins');

  const names = Object.keys(agg);
  if (names.length === 0) return res.status(400).json({ success: false, message: '집계할 항목이 없습니다.' });

  const valuesSql = [];
  const params = [];
  names.forEach((n, i) => {
    const b = i * 4;
    valuesSql.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`);
    params.push(n, agg[n].wins, agg[n].picks, agg[n].matches);
  });

  try {
    await query(
      `INSERT INTO tournament_stats (name, wins, picks, matches)
       VALUES ${valuesSql.join(', ')}
       ON CONFLICT (name) DO UPDATE SET
         wins    = tournament_stats.wins    + EXCLUDED.wins,
         picks   = tournament_stats.picks   + EXCLUDED.picks,
         matches = tournament_stats.matches + EXCLUDED.matches,
         updated_at = now()`,
      params
    );
    res.status(201).json({ success: true, data: { champion, recorded: names.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '결과 저장에 실패했습니다.' });
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
