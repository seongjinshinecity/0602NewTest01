import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// --- DB 연결 (pg / node-postgres → Supabase) ---
// DATABASE_URL 은 Supabase pooler(...pooler.supabase.com:6543) 이며 SSL 을 강제한다.
// 단, localhost/127.0.0.1 로컬 Postgres 로 테스트할 때는 SSL 을 끈다.
const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// 허용 카테고리 (프론트 select 와 동일). 자유 입력도 허용하되 비어있으면 거부.
const CATEGORIES = ['식비', '교통', '임대료', '구독료', '경조사', '문화/여가', '의료', '쇼핑', '급여', '용돈', '기타'];

// 시작 시 테이블 보장
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id         BIGSERIAL PRIMARY KEY,
      type       TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
      category   TEXT          NOT NULL,
      amount     NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      memo       TEXT          NOT NULL DEFAULT '',
      date       DATE          NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_category ON entries (category);`);
  console.log('✅ entries 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 입력 검증 헬퍼: 등록/수정 공통
function validateBody(body) {
  const type = String(body?.type || '').trim();
  const category = String(body?.category || '').trim();
  const memo = String(body?.memo || '').trim();
  const amountNum = Number(body?.amount);
  const date = String(body?.date || '').trim();

  if (type !== 'income' && type !== 'expense') return { error: "type 은 'income' 또는 'expense' 여야 합니다" };
  if (!category) return { error: '카테고리를 입력하세요' };
  if (!Number.isFinite(amountNum) || amountNum < 0) return { error: '금액은 0 이상의 숫자여야 합니다' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: '날짜 형식은 YYYY-MM-DD 여야 합니다' };

  return { value: { type, category, amount: amountNum, memo, date: date || null } };
}

// 메타: 카테고리 목록
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

// =====================================================================
// 내역 CRUD
// =====================================================================

// 목록 조회: GET /api/entries  (?month=YYYY-MM, ?type=income|expense 선택)
app.get('/api/entries', async (req, res) => {
  try {
    const conds = [];
    const params = [];
    const month = String(req.query.month || '').trim();
    const type = String(req.query.type || '').trim();
    if (/^\d{4}-\d{2}$/.test(month)) {
      params.push(month);
      conds.push(`to_char(date, 'YYYY-MM') = $${params.length}`);
    }
    if (type === 'income' || type === 'expense') {
      params.push(type);
      conds.push(`type = $${params.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, type, category, amount::float8 AS amount, memo, to_char(date, 'YYYY-MM-DD') AS date, created_at
         FROM entries
         ${where}
        ORDER BY date DESC, id DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '내역 조회 실패', detail: err.message });
  }
});

// 등록: POST /api/entries
app.post('/api/entries', async (req, res) => {
  try {
    const { error, value } = validateBody(req.body);
    if (error) return res.status(400).json({ error });
    const result = await pool.query(
      `INSERT INTO entries (type, category, amount, memo, date)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
       RETURNING id, type, category, amount::float8 AS amount, memo, to_char(date, 'YYYY-MM-DD') AS date, created_at`,
      [value.type, value.category, value.amount, value.memo, value.date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '내역 저장 실패', detail: err.message });
  }
});

// 수정: PUT /api/entries/:id
app.put('/api/entries/:id', async (req, res) => {
  try {
    const { error, value } = validateBody(req.body);
    if (error) return res.status(400).json({ error });
    const result = await pool.query(
      `UPDATE entries
          SET type = $1, category = $2, amount = $3, memo = $4, date = COALESCE($5::date, date)
        WHERE id = $6
        RETURNING id, type, category, amount::float8 AS amount, memo, to_char(date, 'YYYY-MM-DD') AS date, created_at`,
      [value.type, value.category, value.amount, value.memo, value.date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '내역 없음' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '내역 수정 실패', detail: err.message });
  }
});

// 삭제: DELETE /api/entries/:id
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM entries WHERE id = $1 RETURNING id`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '내역 없음' });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '내역 삭제 실패', detail: err.message });
  }
});

// =====================================================================
// 통계 (SQL GROUP BY)
// =====================================================================

// 카테고리별 합계: GET /api/summary/category  (?month=YYYY-MM, ?type=expense|income 선택, 기본 expense)
app.get('/api/summary/category', async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();
    const type = String(req.query.type || 'expense').trim();
    const params = [type === 'income' ? 'income' : 'expense'];
    let monthCond = '';
    if (/^\d{4}-\d{2}$/.test(month)) {
      params.push(month);
      monthCond = `AND to_char(date, 'YYYY-MM') = $2`;
    }
    const result = await pool.query(
      `SELECT category, SUM(amount)::float8 AS total, COUNT(*)::int AS count
         FROM entries
        WHERE type = $1 ${monthCond}
        GROUP BY category
        ORDER BY total DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '카테고리 합계 실패', detail: err.message });
  }
});

// 월별 수입/지출 합계: GET /api/summary/monthly
app.get('/api/summary/monthly', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT to_char(date, 'YYYY-MM') AS month,
              SUM(amount) FILTER (WHERE type = 'income')::float8  AS income,
              SUM(amount) FILTER (WHERE type = 'expense')::float8 AS expense
         FROM entries
        GROUP BY month
        ORDER BY month`
    );
    res.json(result.rows.map((r) => ({ month: r.month, income: r.income || 0, expense: r.expense || 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '월별 합계 실패', detail: err.message });
  }
});

// 총계: GET /api/summary/totals  (?month 선택)
app.get('/api/summary/totals', async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();
    const params = [];
    let where = '';
    if (/^\d{4}-\d{2}$/.test(month)) {
      params.push(month);
      where = `WHERE to_char(date, 'YYYY-MM') = $1`;
    }
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::float8  AS income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::float8 AS expense
       FROM entries ${where}`,
      params
    );
    const { income, expense } = result.rows[0];
    res.json({ income, expense, balance: income - expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '총계 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 가계부 http://localhost:${PORT} 에서 실행 중`));
  })
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   .env 의 DATABASE_URL(Supabase) 설정이 맞는지 확인하세요. (.env.example 참고)');
    process.exit(1);
  });
