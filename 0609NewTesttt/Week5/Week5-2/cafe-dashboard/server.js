import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../shared/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from '../shared/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MENU = [
  ['아메리카노', 4500], ['카페라떼', 5000], ['바닐라라떼', 5500],
  ['콜드브루', 5500], ['크루아상', 4000], ['치즈케이크', 6500], ['아인슈페너', 6000],
];

// 매출 데이터 시드 (최근 30일). 평일/주말·메뉴 인기 가중을 넣어 그럴듯하게.
async function seedSales() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM cafe_sales`);
  if (rows[0].n > 0) return;
  const today = new Date();
  const values = [];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    const iso = day.toISOString().slice(0, 10);
    const weekend = [0, 6].includes(day.getDay());
    MENU.forEach(([item, price], idx) => {
      const base = (7 - idx) * (weekend ? 9 : 6); // 앞 메뉴일수록 인기
      const qty = Math.max(1, Math.round(base + (Math.random() - 0.5) * 8));
      values.push(`('${iso}','${item}',${qty},${qty * price})`);
    });
  }
  await pool.query(
    `INSERT INTO cafe_sales (date, item, qty, amount) VALUES ${values.join(',')}`
  );
  console.log('☕ 카페 매출 샘플(30일) 시드 완료');
}

async function initDb() {
  await ensureAuthTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafe_sales (
      id     BIGSERIAL PRIMARY KEY,
      date   DATE          NOT NULL,
      item   TEXT          NOT NULL,
      qty    INT           NOT NULL CHECK (qty >= 0),
      amount NUMERIC(12,0) NOT NULL CHECK (amount >= 0)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cafe_sales_date ON cafe_sales (date DESC);`);
  await seedSales();
  console.log('✅ cafe_sales 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

registerAuthRoutes(app);

// === 데이터소스 1: 카페 매출 DB (Supabase) ===
async function salesSummary() {
  const totals = await pool.query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE date = CURRENT_DATE), 0)::float8              AS today,
      COALESCE(SUM(amount) FILTER (WHERE date = CURRENT_DATE - 1), 0)::float8          AS yesterday,
      COALESCE(SUM(amount) FILTER (WHERE date >= CURRENT_DATE - 6), 0)::float8         AS last7,
      COALESCE(SUM(qty)    FILTER (WHERE date = CURRENT_DATE - 1), 0)::int             AS yday_cups
    FROM cafe_sales
  `);
  const top = await pool.query(`
    SELECT item, SUM(qty)::int AS cups, SUM(amount)::float8 AS revenue
      FROM cafe_sales WHERE date >= CURRENT_DATE - 6
     GROUP BY item ORDER BY cups DESC LIMIT 5
  `);
  const trend = await pool.query(`
    SELECT to_char(date,'MM-DD') AS d, SUM(amount)::float8 AS amount
      FROM cafe_sales WHERE date >= CURRENT_DATE - 13
     GROUP BY date ORDER BY date
  `);
  return { ...totals.rows[0], top: top.rows, trend: trend.rows };
}

app.get('/api/cafe/summary', requireAuth, async (_req, res) => {
  try { res.json(await salesSummary()); }
  catch (err) { console.error(err); res.status(500).json({ error: '매출 요약 실패', detail: err.message }); }
});

// === 데이터소스 2: 외부 날씨 API (Open-Meteo, 키 불필요) ===
const WCODE = { 0:'맑음', 1:'대체로 맑음', 2:'구름 조금', 3:'흐림', 45:'안개', 48:'안개',
  51:'약한 이슬비', 53:'이슬비', 55:'강한 이슬비', 61:'약한 비', 63:'비', 65:'강한 비',
  71:'약한 눈', 73:'눈', 75:'강한 눈', 80:'소나기', 81:'소나기', 82:'강한 소나기', 95:'천둥번개' };

async function getWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978' +
    '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul';
  const r = await fetch(url);
  if (!r.ok) throw new Error('weather ' + r.status);
  const j = await r.json();
  const code = j.current?.weather_code;
  return {
    temp: j.current?.temperature_2m,
    desc: WCODE[code] || '정보 없음',
    code,
    max: j.daily?.temperature_2m_max?.[0],
    min: j.daily?.temperature_2m_min?.[0],
  };
}

app.get('/api/cafe/weather', requireAuth, async (_req, res) => {
  try { res.json(await getWeather()); }
  catch (err) { console.error(err); res.status(502).json({ error: '날씨 조회 실패', detail: err.message }); }
});

// === AI 종합 브리핑 (규칙 기반: 매출 + 날씨 종합) ===
app.get('/api/cafe/briefing', requireAuth, async (req, res) => {
  try {
    const s = await salesSummary();
    let w = null;
    try { w = await getWeather(); } catch { /* 날씨 실패해도 브리핑은 생성 */ }
    const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');
    const diff = s.yesterday ? ((s.today - s.yesterday) / s.yesterday) * 100 : 0;
    const best = s.top[0];

    const lines = [];
    lines.push(`☀️ 좋은 아침이에요, ${req.user.display_name} 사장님!`);
    lines.push(`어제는 ${won(s.yesterday)} (${s.yday_cups}잔) 판매됐어요. 최근 7일 누적은 ${won(s.last7)}.`);
    if (best) lines.push(`이번 주 인기 메뉴는 «${best.item}» (${best.cups}잔). 재고와 원두를 넉넉히 준비해 두세요.`);
    if (w) {
      const hot = w.code === 0 || w.max >= 26;
      const rain = [51,53,55,61,63,65,80,81,82,95].includes(w.code);
      lines.push(`오늘 서울은 ${w.desc}, ${Math.round(w.temp)}°C (최고 ${Math.round(w.max)}/최저 ${Math.round(w.min)}°C).`);
      if (rain) lines.push(`☔ 비 예보 — 방문객이 줄 수 있어요. 따뜻한 메뉴와 테이크아웃 쿠폰을 준비해 보세요.`);
      else if (hot) lines.push(`🧊 더운 날 — 콜드브루·아이스 음료 비중을 늘리고 얼음 재고를 확인하세요.`);
      else lines.push(`🍃 야외 좌석 컨디션이 좋아요. 시즌 메뉴를 전면에 배치해 보세요.`);
    }
    lines.push(diff >= 0
      ? `📈 어제 대비 오늘 +${diff.toFixed(0)}% 페이스. 좋은 흐름이에요.`
      : `📉 어제 대비 오늘 ${diff.toFixed(0)}% — 점심 타임 프로모션을 고려해 보세요.`);

    res.json({ briefing: lines.join('\n'), generated_at: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '브리핑 생성 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3003;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 카페 대시보드 http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   루트 .env 의 DATABASE_URL(Supabase) 을 확인하세요.');
    process.exit(1);
  });
