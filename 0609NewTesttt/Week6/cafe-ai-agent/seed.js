// 카페 운영 데이터 시드 — cafe_sales(일별 메뉴 판매) + cafe_reviews(손님 리뷰)
// 기간: 2026-06-22(월) ~ 2026-07-05(일), 14일. 결정론적(고정 시드) 생성.
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });
const pool = new pg.Pool({ connectionString: (process.env.DATABASE_URL || '').trim(), ssl: { rejectUnauthorized: false } });

// 메뉴: [이름, 카테고리, 단가, 평일 기본판매량, 주말 기본판매량]
// 데일리브루 특성: 치즈케이크는 평일 카공족, 초코쿠키·크로플은 주말 모임 수요.
const MENUS = [
  ['아메리카노',   '커피',   4500, 38, 30],
  ['카페라떼',     '커피',   5000, 26, 24],
  ['바닐라라떼',   '커피',   5500, 14, 18],
  ['카푸치노',     '커피',   5000,  8, 10],
  ['자몽에이드',   '음료',   6000,  7, 14],
  ['아이스티',     '음료',   5000,  9, 12],
  ['치즈케이크',   '디저트', 6500, 16, 11],
  ['크로플',       '디저트', 6000, 10, 19],
  ['초코쿠키',     '디저트', 3000, 12, 25],
];

// 고정 의사난수 (재현 가능)
let s = 42;
const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };

const REVIEWS = [
  ['2026-06-23', 5, '치즈케이크가 진짜 부드러워요. 평일 오후에 노트북 들고 오기 최고. 콘센트 자리 많아서 단골 됨.'],
  ['2026-06-24', 4, '커피는 무난, 디저트가 주인공인 집. 크로플 겉바속촉. 자리가 좁아서 주말엔 좀 기다림.'],
  ['2026-06-27', 5, '주말에 친구들이랑 디저트 모임으로 왔는데 크로플이랑 초코쿠키 조합 좋았어요. 치즈케이크는 품절이라 아쉬움.'],
  ['2026-06-29', 3, '월요일 점심에 테이크아웃 했는데 줄이 좀 길었어요. 맛은 좋은데 회전이 느린 느낌.'],
  ['2026-07-01', 5, '카공하기 좋은 조용한 분위기. 바닐라라떼 달지 않고 딱 좋아요. 오래 있어도 눈치 안 보임.'],
  ['2026-07-04', 4, '토요일 오후엔 자리 잡기가 힘들어요. 디저트 쇼케이스는 구경만 해도 행복. 치즈케이크 또 품절…'],
  ['2026-07-05', 5, '자몽에이드 여름 한정 느낌으로 상큼. 디저트가 직접 굽는 거라 그런지 확실히 신선해요.'],
];

const t0 = new Date('2026-06-22T00:00:00Z').getTime();
async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafe_sales (
      id        BIGSERIAL PRIMARY KEY,
      date      DATE NOT NULL,
      menu_name TEXT NOT NULL,
      category  TEXT NOT NULL,
      quantity  INT  NOT NULL CHECK (quantity >= 0),
      amount    NUMERIC(12,0) NOT NULL CHECK (amount >= 0)
    );
    CREATE INDEX IF NOT EXISTS idx_cafe_sales_date ON cafe_sales (date DESC);
    CREATE TABLE IF NOT EXISTS cafe_reviews (
      id      BIGSERIAL PRIMARY KEY,
      date    DATE NOT NULL,
      rating  INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL
    );
  `);
  const n = await pool.query(`SELECT COUNT(*)::int AS n FROM cafe_sales`);
  if (n.rows[0].n > 0) { console.log(`이미 ${n.rows[0].n}행 존재 — 시드 생략`); await pool.end(); return; }

  let rows = 0, total = 0;
  for (let d = 0; d < 14; d++) {
    const date = new Date(t0 + d * 86400000);
    const iso = date.toISOString().slice(0, 10);
    const dow = date.getUTCDay();               // 0=일, 6=토
    const weekend = dow === 0 || dow === 6;
    for (const [name, cat, price, wd, we] of MENUS) {
      const base = weekend ? we : wd;
      const qty = Math.max(0, Math.round(base * (0.85 + rnd() * 0.3)));
      if (!qty) continue;
      const amount = qty * price;
      await pool.query(
        `INSERT INTO cafe_sales (date, menu_name, category, quantity, amount) VALUES ($1,$2,$3,$4,$5)`,
        [iso, name, cat, qty, amount]
      );
      rows++; total += amount;
    }
  }
  for (const [date, rating, content] of REVIEWS) {
    await pool.query(`INSERT INTO cafe_reviews (date, rating, content) VALUES ($1,$2,$3)`, [date, rating, content]);
  }
  console.log(`✅ cafe_sales ${rows}행 (총매출 ${total.toLocaleString()}원, 14일) + cafe_reviews ${REVIEWS.length}건 시드 완료`);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
