// 데일리브루 사장님 대시보드 — [Auth+MCP+DB+App] 보스 퀘스트
// 데이터 소스 ①: Supabase Postgres (cafe_sales·cafe_reviews — cafe-ai-agent 퀘스트에서 시드)
// 데이터 소스 ②: Open-Meteo 날씨 API (성수동 좌표, 키 불필요)
// 브리핑: 두 소스를 서버가 종합해 "오늘의 카페 브리핑" 생성 (규칙 기반 — README 참고)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './lib/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbReady = null;
export function initDb() {
  dbReady ??= ensureAuthTable(); // cafe_sales/cafe_reviews 는 cafe-ai-agent seed.js 가 만든다
  return dbReady;
}

export const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(async (_req, _res, next) => { try { await initDb(); next(); } catch (e) { next(e); } });

registerAuthRoutes(app);

// ── 날씨 (성수동: 37.544, 127.056) — Open-Meteo, 키 불필요
async function getWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.544&longitude=127.056'
    + '&current=temperature_2m,precipitation,weather_code'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Asia%2FSeoul';
  const r = await fetch(url);
  if (!r.ok) throw new Error('날씨 API 실패');
  const d = await r.json();
  const code = d.current.weather_code;
  const desc = code === 0 ? '맑음' : code <= 3 ? '구름 조금' : code <= 48 ? '흐림/안개' : code <= 67 ? '비' : code <= 77 ? '눈' : code <= 82 ? '소나기' : '뇌우';
  return {
    now: d.current.temperature_2m,
    max: d.daily.temperature_2m_max[0],
    min: d.daily.temperature_2m_min[0],
    rainProb: d.daily.precipitation_probability_max[0],
    desc,
  };
}

// ── 매출 수기 입력 (v1 핵심 기능 — DEV.md Phase 2.5 "실사용의 관문")
// 시드 데이터에서 실제 장부로 넘어가는 유일한 통로. 사장님이 마감 후 그날 판매를 직접 기록한다.
app.post('/api/sales', requireAuth, async (req, res) => {
  try {
    const { date, menu_name, category, quantity, amount } = req.body ?? {};
    const qty = Number(quantity), amt = Number(amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ error: '날짜는 YYYY-MM-DD 형식이어야 합니다' });
    if (!String(menu_name ?? '').trim()) return res.status(400).json({ error: '메뉴 이름을 입력해주세요' });
    if (!String(category ?? '').trim()) return res.status(400).json({ error: '카테고리를 선택해주세요' });
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: '수량은 1 이상의 정수여야 합니다' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: '총 금액을 확인해주세요' });
    const { rows: [sale] } = await pool.query(
      `INSERT INTO cafe_sales (date, menu_name, category, quantity, amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, date::text, menu_name, category, quantity, amount::int`,
      [date, String(menu_name).trim(), String(category).trim(), qty, amt]
    );
    res.status(201).json({ sale });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '매출 저장 실패', detail: err.message });
  }
});

// 오늘 입력한 내역 확인·정정용 (같은 날짜의 행 목록 + 삭제)
app.get('/api/sales', requireAuth, async (req, res) => {
  try {
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '날짜는 YYYY-MM-DD 형식이어야 합니다' });
    const { rows } = await pool.query(
      `SELECT id, date::text, menu_name, category, quantity, amount::int
       FROM cafe_sales WHERE date = $1::date ORDER BY id DESC`, [date]);
    res.json({ sales: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '매출 조회 실패', detail: err.message });
  }
});

app.delete('/api/sales/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: '잘못된 id' });
    const { rowCount } = await pool.query(`DELETE FROM cafe_sales WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: '해당 매출 기록이 없습니다' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '매출 삭제 실패', detail: err.message });
  }
});

// ── 대시보드 종합 API (로그인 필수 — 사장님 전용)
app.get('/api/dashboard', requireAuth, async (_req, res) => {
  try {
    // DB 최신 날짜를 "오늘"로 간주 (시드 데이터 기준)
    const [{ rows: [last] }, weather] = await Promise.all([
      pool.query(`SELECT MAX(date)::text AS today FROM cafe_sales`),
      getWeather().catch(() => null),
    ]);
    const today = last.today;

    const [daily, cats, top3, reviews, yesterday] = await Promise.all([
      pool.query(`SELECT date::text, SUM(amount)::int AS amount FROM cafe_sales
                  WHERE date > $1::date - 7 GROUP BY date ORDER BY date`, [today]),
      pool.query(`SELECT category, SUM(amount)::int AS amount FROM cafe_sales
                  WHERE date = $1::date GROUP BY category ORDER BY amount DESC`, [today]),
      pool.query(`SELECT menu_name, SUM(quantity)::int AS qty, SUM(amount)::int AS amount FROM cafe_sales
                  WHERE date > $1::date - 7 GROUP BY menu_name ORDER BY amount DESC LIMIT 3`, [today]),
      pool.query(`SELECT date::text, rating, content FROM cafe_reviews ORDER BY date DESC LIMIT 4`),
      pool.query(`SELECT SUM(amount)::int AS amount FROM cafe_sales WHERE date = $1::date - 1`, [today]),
    ]);

    const todayAmt = daily.rows.at(-1)?.amount ?? 0;
    const yAmt = yesterday.rows[0]?.amount ?? 0;
    const diffPct = yAmt ? Math.round(((todayAmt - yAmt) / yAmt) * 100) : null;

    // ── 오늘의 브리핑: DB + 날씨 종합 (규칙 기반 생성)
    const b = [];
    b.push(`${today} 매출 ${todayAmt.toLocaleString()}원` + (diffPct != null ? ` (전일 대비 ${diffPct >= 0 ? '+' : ''}${diffPct}%)` : ''));
    if (top3.rows[0]) b.push(`이번 주 매출 1위는 ${top3.rows[0].menu_name} (${top3.rows[0].qty}개·${top3.rows[0].amount.toLocaleString()}원)`);
    if (weather) {
      b.push(`오늘 성수동 ${weather.desc}, ${weather.min}~${weather.max}℃ · 강수확률 ${weather.rainProb}%`);
      if (weather.rainProb >= 60) b.push(`비 예보 → 테이크아웃 감소 예상. 매장 체류 손님용 '커피+디저트 세트' 입간판 추천`);
      else if (weather.max >= 28) b.push(`더운 날 → 아이스 음료·자몽에이드 재료 여유 있게 준비`);
      else b.push(`외출하기 좋은 날 → 주말이면 치즈케이크 증량(품절 방지) 체크`);
    }
    const negReview = reviews.rows.find((r) => r.rating <= 3);
    if (negReview) b.push(`체크할 리뷰(${negReview.rating}점): "${negReview.content.slice(0, 40)}…"`);

    res.json({
      today, todayAmt, diffPct,
      weekly: daily.rows,
      categories: cats.rows,
      top3: top3.rows,
      reviews: reviews.rows,
      weather,
      briefing: b,
      sources: ['Supabase DB (cafe_sales · cafe_reviews)', 'Open-Meteo 날씨 API'],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '대시보드 조회 실패', detail: err.message });
  }
});
