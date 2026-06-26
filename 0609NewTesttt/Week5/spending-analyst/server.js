import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// --- DB (가계부와 동일한 Supabase) ---
const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const MODEL = (process.env.ANALYST_MODEL || 'claude-opus-4-8').trim();
const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

// =====================================================================
// 읽기 전용 SQL 실행 (에이전트 툴) — SELECT 만 허용
// =====================================================================
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|comment|vacuum)\b/i;

async function runReadOnlySql(query) {
  const q = String(query || '').trim().replace(/;+\s*$/, ''); // 끝 세미콜론 제거
  if (!/^select\b/i.test(q) && !/^with\b/i.test(q)) {
    throw new Error('SELECT(또는 WITH) 쿼리만 허용됩니다.');
  }
  if (q.includes(';')) throw new Error('한 번에 하나의 쿼리만 실행할 수 있습니다.');
  if (FORBIDDEN.test(q)) throw new Error('읽기 전용 쿼리만 허용됩니다(데이터 변경 불가).');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION READ ONLY');
    await client.query('SET LOCAL statement_timeout = 8000');
    const result = await client.query(q);
    await client.query('ROLLBACK');
    const rows = result.rows.slice(0, 1000); // 과도한 토큰 방지
    return { rowCount: result.rowCount, rows, truncated: result.rows.length > rows.length };
  } finally {
    client.release();
  }
}

// =====================================================================
// 에이전트: 질문 → (DB 조회 툴 반복) → 한국어 분석 답변
// =====================================================================
const TOOLS = [
  {
    name: 'run_sql',
    description:
      "가계부 DB의 `entries` 테이블에 읽기 전용 SQL SELECT 를 실행하고 결과를 JSON 으로 돌려준다. " +
      "사용자의 수입/지출 데이터를 조회·집계할 때 사용한다. SELECT/WITH 만 가능하며 데이터 변경은 불가능하다.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'entries 테이블에 대한 단일 PostgreSQL SELECT 문' },
      },
      required: ['query'],
    },
  },
];

const SYSTEM = `너는 개인 가계부 데이터를 분석해주는 한국어 소비 분석가다.

데이터베이스(PostgreSQL, Supabase)에는 단일 테이블 entries 가 있다:
  entries(
    id         BIGINT,
    type       TEXT   -- 'income'(수입) 또는 'expense'(지출)
    category   TEXT   -- 식비, 교통, 임대료, 구독료, 경조사, 문화/여가, 의료, 쇼핑, 급여, 용돈, 기타 등
    amount     NUMERIC -- 금액(원)
    memo       TEXT
    date       DATE
  )

규칙:
- 사용자의 질문에 답하기 위해 필요한 데이터는 반드시 run_sql 툴로 조회한다. 추측하지 말 것.
- 집계는 SQL의 GROUP BY / SUM / 필터를 적극 활용한다. 금액 비교는 to_char(date,'YYYY-MM') 로 월 단위 그룹을 만들 수 있다.
- 여러 각도가 필요하면 run_sql 을 여러 번 호출해도 된다.
- 최종 답변은 한국어로, 핵심 숫자를 먼저 제시하고 간단한 해석·조언을 덧붙인다. 금액은 1,000 단위 콤마와 '원'을 붙인다.
- 데이터가 없으면 없다고 솔직히 말한다. 표가 도움이 되면 간단한 표로 정리한다.`;

async function ask(question) {
  const messages = [{ role: 'user', content: question }];
  const steps = [];

  for (let i = 0; i < 8; i++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: TOOLS,
      thinking: { type: 'adaptive' },
      messages,
    });

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason !== 'tool_use') {
      const answer = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { answer, steps };
    }

    const toolResults = [];
    for (const block of resp.content) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'run_sql') {
        const query = block.input?.query || '';
        try {
          const out = await runReadOnlySql(query);
          steps.push({ sql: query, rowCount: out.rowCount });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(out),
          });
        } catch (err) {
          steps.push({ sql: query, error: err.message });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `오류: ${err.message}`,
            is_error: true,
          });
        }
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }
  return { answer: '분석 단계가 너무 길어졌습니다. 질문을 더 구체적으로 해주세요.', steps };
}

// =====================================================================
// HTTP
// =====================================================================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/ask', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  if (!question) return res.status(400).json({ error: '질문을 입력하세요.' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY 가 설정되지 않았습니다 (.env 확인).' });
  }
  try {
    const result = await ask(question);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '분석 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3100;
// 시작 시 DB 연결만 가볍게 확인
pool
  .query('SELECT 1')
  .then(() => app.listen(PORT, () => console.log(`🧠 소비 분석가 http://localhost:${PORT} (model: ${MODEL})`)))
  .catch((err) => {
    console.error('❌ DB 연결 실패:', err.message);
    console.error('   .env 의 DATABASE_URL(가계부와 동일) 을 확인하세요.');
    process.exit(1);
  });
