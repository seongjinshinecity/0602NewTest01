// ============================================================
// AI 레시피 메이커 — Express 서버 (REST API)
// ------------------------------------------------------------
//  · 재료를 입력하면 AI(Claude)가 레시피를 자동 생성
//  · 생성된 레시피를 DB(PostgreSQL: PGlite/Supabase)에 저장
//  · 저장된 레시피를 목록으로 조회 / 삭제
//
//  ANTHROPIC_API_KEY 가 설정되어 있으면 실제 Claude(claude-opus-4-8)로
//  생성하고, 없으면 규칙 기반 폴백 생성기로 동작합니다(키 없이도 실행 가능).
// ============================================================

try { process.loadEnvFile(); } catch { /* .env 없음 */ }

const express = require('express');
const path = require('path');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3004;
const MODEL = 'claude-opus-4-8';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 입력 정리
function clean(raw, max = 200) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > max ? s.slice(0, max) : s;
}

// 재료 입력(문자열/배열)을 깔끔한 배열로 정규화
function normalizeIngredients(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') list = raw.split(/[,\n·]/);
  return [...new Set(list.map((s) => clean(String(s), 40)).filter(Boolean))].slice(0, 30);
}

// 레시피 행을 클라이언트용 객체로 변환 (JSON 컬럼 파싱)
function rowToRecipe(r) {
  const parse = (v) => { try { return JSON.parse(v); } catch { return []; } };
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: parse(r.ingredients),
    steps: parse(r.steps),
    used_ingredients: parse(r.used_ingredients),
    cook_time: r.cook_time,
    difficulty: r.difficulty,
    source: r.source,
    created_at: r.created_at,
  };
}

// ============================================================
//  레시피 생성 (AI 또는 폴백)
// ============================================================

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '요리 이름 (한국어, 이모지 포함 가능)' },
    description: { type: 'string', description: '요리에 대한 한 줄 소개' },
    ingredients: {
      type: 'array',
      items: { type: 'string' },
      description: '필요한 재료 목록 (입력 재료 + 기본 양념). 각 항목은 "재료 분량" 형태',
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
      description: '조리 순서. 각 항목은 한 단계의 설명',
    },
    cook_time: { type: 'string', description: '예상 조리 시간 (예: 약 20분)' },
    difficulty: { type: 'string', enum: ['쉬움', '보통', '어려움'] },
  },
  required: ['title', 'description', 'ingredients', 'steps', 'cook_time', 'difficulty'],
  additionalProperties: false,
};

// 실제 Claude 로 레시피 생성 (공식 Anthropic SDK 사용)
async function generateWithClaude(ingredients, apiKey) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      '당신은 한국 가정식에 능숙한 요리사입니다. 주어진 재료로 실제로 만들 수 있는 ' +
      '간단하고 맛있는 **볶음요리** 레시피 1개를 한국어로 제안합니다. 반드시 팬이나 웍에 ' +
      '기름을 두르고 볶는 조리법이어야 하며, 요리 이름에도 "볶음"이 들어가야 합니다. ' +
      '입력된 재료를 최대한 활용하고, 소금·후추·식용유·간장·굴소스 같은 기본 양념은 자유롭게 더해도 됩니다. ' +
      '특히 볶음요리의 감칠맛을 위해 굴소스를 꼭 활용하세요. ' +
      '분량과 조리 순서는 초보자도 따라 할 수 있도록 구체적으로 작성하세요.',
    messages: [
      {
        role: 'user',
        content: `다음 재료로 만들 수 있는 볶음요리 레시피를 하나 만들어 주세요: ${ingredients.join(', ')}`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('AI 응답에 텍스트가 없습니다.');
  // 구조화 출력이면 순수 JSON이지만, 혹시 코드펜스/잡텍스트가 섞여도 견디도록 추출
  let raw = textBlock.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI 응답을 JSON으로 해석할 수 없습니다.');
    data = JSON.parse(m[0]);
  }
  return { ...data, source: 'ai' };
}

// 규칙 기반 폴백 레시피 생성 (API 키 없이도 동작) — 항상 볶음요리
function fallbackRecipe(ingredients) {
  const main = ingredients[0] || '재료';
  return {
    title: `${main} 볶음`,
    description: `냉장고 속 ${ingredients.join(', ')}(으)로 만드는 간단한 볶음요리입니다.`,
    ingredients: [...ingredients.map((n) => `${n} 적당량`), '식용유 1큰술', '굴소스 1큰술', '간장 1작은술', '소금·후추 약간'],
    steps: [
      `${ingredients.join(', ')}을(를) 먹기 좋은 크기로 손질합니다.`,
      `달군 팬에 식용유를 두르고 ${main}부터 넣어 센 불에서 볶습니다.`,
      `나머지 재료를 넣고 골고루 볶습니다.`,
      `굴소스 1큰술과 간장을 둘러 감칠맛을 내고, 소금·후추로 간을 맞춰 한 번 더 볶아 완성합니다.`,
    ],
    cook_time: '약 15분',
    difficulty: '쉬움',
    source: 'fallback',
  };
}

async function generateRecipe(ingredients) {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (apiKey) {
    try {
      return await generateWithClaude(ingredients, apiKey);
    } catch (err) {
      console.error('⚠️  AI 생성 실패 → 폴백 사용:', err.message);
    }
  }
  return fallbackRecipe(ingredients);
}

// ----- 생성(미리보기): 저장하지 않고 레시피만 반환 -----
app.post('/api/recipes/generate', async (req, res) => {
  const ingredients = normalizeIngredients(req.body?.ingredients);
  if (ingredients.length === 0) {
    return res.status(400).json({ success: false, message: '재료를 1개 이상 입력해 주세요.' });
  }
  try {
    const recipe = await generateRecipe(ingredients);
    res.json({ success: true, data: { ...recipe, used_ingredients: ingredients } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 생성에 실패했습니다.' });
  }
});

// ============================================================
//  저장 / 조회 / 삭제
// ============================================================

// ----- 목록 조회 -----
app.get('/api/recipes', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, description, ingredients, steps, used_ingredients,
              cook_time, difficulty, source, created_at
       FROM recipes ORDER BY id DESC`
    );
    res.json({ success: true, data: rows.map(rowToRecipe) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피를 불러오지 못했습니다.' });
  }
});

// ----- 저장 (AI가 생성한 레시피를 DB에 저장) -----
app.post('/api/recipes', async (req, res) => {
  const b = req.body || {};
  const title = clean(b.title, 120);
  if (!title) return res.status(400).json({ success: false, message: '레시피 제목이 없습니다.' });

  const description = clean(b.description, 500);
  const ingredients = Array.isArray(b.ingredients) ? b.ingredients.map((s) => String(s)) : [];
  const steps = Array.isArray(b.steps) ? b.steps.map((s) => String(s)) : [];
  const used = Array.isArray(b.used_ingredients) ? b.used_ingredients.map((s) => String(s)) : [];
  const cookTime = clean(b.cook_time, 40);
  const difficulty = clean(b.difficulty, 20);
  const source = b.source === 'fallback' ? 'fallback' : 'ai';

  try {
    const { rows } = await query(
      `INSERT INTO recipes (title, description, ingredients, steps, used_ingredients, cook_time, difficulty, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, ingredients, steps, used_ingredients, cook_time, difficulty, source, created_at`,
      [title, description, JSON.stringify(ingredients), JSON.stringify(steps),
       JSON.stringify(used), cookTime, difficulty, source]
    );
    res.status(201).json({ success: true, data: rowToRecipe(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 저장에 실패했습니다.' });
  }
});

// ----- 삭제 -----
app.delete('/api/recipes/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: '잘못된 ID 입니다.' });
  try {
    const { rows } = await query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '레시피를 찾을 수 없습니다.' });
    res.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '레시피 삭제에 실패했습니다.' });
  }
});

// ----- AI 사용 가능 여부 (프런트 표시용) -----
app.get('/api/status', (_req, res) => {
  res.json({ success: true, data: { ai: Boolean((process.env.ANTHROPIC_API_KEY || '').trim()), model: MODEL } });
});

// ----- SPA fallback -----
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ AI 레시피 메이커 실행 중 · http://localhost:${PORT}`));
}
module.exports = app;
