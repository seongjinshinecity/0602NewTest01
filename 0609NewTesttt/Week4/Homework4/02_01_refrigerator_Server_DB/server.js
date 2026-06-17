// ============================================================
// 냉장고 재료 & 레시피 앱 — Express 서버 (REST API)
// ------------------------------------------------------------
//  · 냉장고 재료 등록 / 목록 조회 / 삭제
//  · 레시피 직접 작성 / 목록 조회 / 삭제
//  · 냉장고에 있는 재료로 "간단한 레시피 자동 생성"
//  모든 데이터는 PostgreSQL(PGlite 또는 Supabase)에 저장됩니다.
// ============================================================

// .env 가 있으면 로드 (DATABASE_URL 등). 없으면 PGlite 로 동작.
try { process.loadEnvFile(); } catch { /* .env 없음 → PGlite 사용 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 입력 정리: 문자열 trim, 길이 제한
function clean(raw, max = 200) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > max ? s.slice(0, max) : s;
}

// ============================================================
//  냉장고 재료 (ingredients)
// ============================================================

// ----- 목록 조회 -----
app.get('/api/ingredients', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, category, quantity, created_at FROM ingredients ORDER BY id DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '재료를 불러오지 못했습니다.' });
  }
});

// ----- 등록 -----
app.post('/api/ingredients', async (req, res) => {
  const name = clean(req.body?.name, 60);
  const category = clean(req.body?.category, 40) || '기타';
  const quantity = clean(req.body?.quantity, 40);
  if (!name) return res.status(400).json({ success: false, message: '재료 이름을 입력해 주세요.' });
  try {
    const { rows } = await query(
      'INSERT INTO ingredients (name, category, quantity) VALUES ($1, $2, $3) RETURNING id, name, category, quantity, created_at',
      [name, category, quantity]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '재료 저장에 실패했습니다.' });
  }
});

// ----- 삭제 -----
app.delete('/api/ingredients/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 재료 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '재료를 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '재료 삭제에 실패했습니다.' });
  }
});

// ============================================================
//  레시피 (recipes)
// ============================================================

// ----- 목록 조회 -----
app.get('/api/recipes', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, title, ingredients, steps, source, created_at FROM recipes ORDER BY id DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피를 불러오지 못했습니다.' });
  }
});

// ----- 작성/저장 -----
app.post('/api/recipes', async (req, res) => {
  const title = clean(req.body?.title, 100);
  const ingredients = clean(req.body?.ingredients, 1000);
  const steps = clean(req.body?.steps, 3000);
  const source = req.body?.source === 'auto' ? 'auto' : 'manual';
  if (!title) return res.status(400).json({ success: false, message: '레시피 제목을 입력해 주세요.' });
  try {
    const { rows } = await query(
      'INSERT INTO recipes (title, ingredients, steps, source) VALUES ($1, $2, $3, $4) RETURNING id, title, ingredients, steps, source, created_at',
      [title, ingredients, steps, source]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 저장에 실패했습니다.' });
  }
});

// ----- 삭제 -----
app.delete('/api/recipes/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 레시피 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '레시피를 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 삭제에 실패했습니다.' });
  }
});

// ----- 냉장고 재료로 간단한 레시피 자동 생성 -----
// 저장된 재료를 읽어 규칙 기반으로 레시피 1개를 구성합니다(LLM 미사용).
// preview=true 면 저장하지 않고 미리보기만 반환합니다.
app.post('/api/recipes/auto', async (req, res) => {
  try {
    const { rows: fridge } = await query('SELECT name FROM ingredients ORDER BY id');
    if (fridge.length === 0) {
      return res.status(400).json({
        success: false,
        message: '냉장고가 비어 있어요. 먼저 재료를 등록한 뒤 자동 생성을 눌러 주세요.',
      });
    }

    const recipe = generateRecipe(fridge.map((r) => r.name));

    // 미리보기 요청이면 저장하지 않고 반환
    if (req.body?.preview) {
      return res.json({ success: true, data: { ...recipe, source: 'auto' } });
    }

    const { rows } = await query(
      'INSERT INTO recipes (title, ingredients, steps, source) VALUES ($1, $2, $3, $4) RETURNING id, title, ingredients, steps, source, created_at',
      [recipe.title, recipe.ingredients, recipe.steps, 'auto']
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 자동 생성에 실패했습니다.' });
  }
});

// ----- 규칙 기반 간단 레시피 생성기 -----
// 저장된 재료 중 2~4개를 골라 조리법 템플릿에 끼워 넣습니다.
function generateRecipe(names) {
  const pick = shuffle([...names]).slice(0, Math.min(4, names.length));
  const main = pick[0];

  const methods = [
    {
      name: '볶음',
      steps: (xs, m) => [
        `1. ${xs.join(', ')} 을(를) 먹기 좋은 크기로 손질합니다.`,
        `2. 달군 팬에 식용유를 두르고 ${m} 부터 넣어 중불에서 볶습니다.`,
        `3. 나머지 재료(${xs.slice(1).join(', ') || '없음'})를 넣고 함께 볶습니다.`,
        `4. 소금·후추로 간을 맞추고 한 번 더 볶아 완성합니다.`,
      ],
    },
    {
      name: '국',
      steps: (xs, m) => [
        `1. 냄비에 물 3컵을 붓고 ${m} 을(를) 넣어 끓입니다.`,
        `2. 끓어오르면 ${xs.slice(1).join(', ') || '준비한 재료'}를 넣습니다.`,
        `3. 중불에서 5~10분간 더 끓여 재료를 익힙니다.`,
        `4. 소금으로 간을 맞추고 불을 끕니다.`,
      ],
    },
    {
      name: '무침',
      steps: (xs, m) => [
        `1. ${xs.join(', ')} 을(를) 깨끗이 손질해 한입 크기로 썹니다.`,
        `2. ${m} 은(는) 필요하면 살짝 데쳐 물기를 뺍니다.`,
        `3. 소금·참기름(있다면)·깨를 넣고 조물조물 무칩니다.`,
        `4. 그릇에 담아 완성합니다.`,
      ],
    },
  ];

  // main 이름 길이로 조리법을 고정 선택(같은 재료엔 안정적으로 동작)
  const method = methods[main.length % methods.length];

  const title = `${main} ${method.name}${pick.length > 1 ? ` (with ${pick.slice(1).join(', ')})` : ''}`;
  const ingredients =
    pick.map((n) => `• ${n}`).join('\n') + '\n• 기본 양념 (소금, 후추, 식용유 등)';
  const steps = method.steps(pick, main).join('\n');

  return { title, ingredients, steps };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----- SPA fallback (Express 5: 와일드카드 경로 대신 미들웨어 사용) -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬: 서버 시작 / Vercel 서버리스: app export (require.main 가드)
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ 냉장고 레시피 앱 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
