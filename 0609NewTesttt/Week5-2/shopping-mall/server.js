import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../shared/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from '../shared/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 샘플 상품 10종 (이미지: Unsplash) — 컨셉: 미니멀 홈·리빙 편집샵 "QUARTER STORE"
const SEED = [
  ['스테인리스 핸드드립 세트', 89000, 'photo-1495474472287-4d71bcdd2085', '브러시드 메탈 드리퍼 + 서버. 하버 카페 시그니처 추출 도구.'],
  ['블랙 머그 350ml', 18000, 'photo-1514228742587-6b1558fcca3d', '무광 세라믹 더블월 머그. 보온성 우수.'],
  ['원두 250g — 다크 로스트', 16000, 'photo-1447933601403-0c6688de566e', '초콜릿·견과 향의 진한 다크 로스트 싱글오리진.'],
  ['우드 트레이', 32000, 'photo-1556910103-1c02745aae4d', '오크 원목 서빙 트레이. 오일 마감.'],
  ['린넨 에이프런', 38000, 'photo-1521335629791-ce4aec67dd15', '차콜 그레이 린넨 100%. 바리스타용 핏.'],
  ['텀블러 470ml', 27000, 'photo-1602143407151-7111542de6e8', '진공 단열 스테인리스 텀블러. 6시간 보온.'],
  ['드립 포트 0.9L', 64000, 'photo-1517668808822-9ebb02f2a0e6', '구스넥 전자식 온도조절 드립 포트.'],
  ['세라믹 디퓨저', 29000, 'photo-1602874801007-bd458bb1b8b6', '미니멀 무드 디퓨저 + 우디 오일.'],
  ['캔버스 에코백', 22000, 'photo-1572196237885-bb40c9ce0bb7', '두꺼운 12oz 캔버스. 로고 실크스크린.'],
  ['노트 + 펜 세트', 15000, 'photo-1531346878377-a5be20888e57', '도트 그리드 노트 + 젤 펜. 카페 다이어리.'],
];

async function initDb() {
  await ensureAuthTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id          BIGSERIAL PRIMARY KEY,
      name        TEXT          NOT NULL,
      price       NUMERIC(12,0) NOT NULL CHECK (price >= 0),
      image_url   TEXT          NOT NULL DEFAULT '',
      description TEXT          NOT NULL DEFAULT ''
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_cart (
      id         BIGSERIAL PRIMARY KEY,
      user_id    BIGINT  NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      product_id BIGINT  NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
      quantity   INT     NOT NULL DEFAULT 1 CHECK (quantity > 0),
      UNIQUE (user_id, product_id)
    );
  `);
  // 상품이 비어있으면 샘플 시드
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM shop_products`);
  if (rows[0].n === 0) {
    for (const [name, price, photo, desc] of SEED) {
      const url = `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=70`;
      await pool.query(
        `INSERT INTO shop_products (name, price, image_url, description) VALUES ($1,$2,$3,$4)`,
        [name, price, url, desc]
      );
    }
    console.log('🛍️  샘플 상품 10종 시드 완료');
  }
  console.log('✅ shop_products / shop_cart 테이블 준비 완료');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

registerAuthRoutes(app);

// 상품 목록 — 공개
app.get('/api/products', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, price::float8 AS price, image_url, description FROM shop_products ORDER BY id`
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '상품 조회 실패', detail: err.message });
  }
});

// 내 장바구니 — 로그인 본인만, 합계 포함
async function getCart(userId) {
  const r = await pool.query(
    `SELECT c.product_id, c.quantity, p.name, p.price::float8 AS price, p.image_url,
            (c.quantity * p.price)::float8 AS line_total
       FROM shop_cart c JOIN shop_products p ON p.id = c.product_id
      WHERE c.user_id = $1
      ORDER BY c.id`,
    [userId]
  );
  const items = r.rows;
  const total = items.reduce((s, i) => s + i.line_total, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, total, count };
}

app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    res.json(await getCart(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '장바구니 조회 실패', detail: err.message });
  }
});

// 담기 (이미 있으면 수량 +qty)
app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.body?.product_id);
    const qty = Math.max(1, Number(req.body?.quantity) || 1);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'product_id 가 필요합니다' });
    const exists = await pool.query(`SELECT 1 FROM shop_products WHERE id = $1`, [productId]);
    if (!exists.rows.length) return res.status(404).json({ error: '존재하지 않는 상품' });
    await pool.query(
      `INSERT INTO shop_cart (user_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = shop_cart.quantity + EXCLUDED.quantity`,
      [req.user.id, productId, qty]
    );
    res.status(201).json(await getCart(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '담기 실패', detail: err.message });
  }
});

// 수량 변경: {quantity} 절대값 또는 {delta} 증감. 0 이하가 되면 삭제.
app.patch('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const pid = Number(req.params.productId);
    let next;
    if (req.body?.quantity != null) next = Number(req.body.quantity);
    else {
      const cur = await pool.query(`SELECT quantity FROM shop_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, pid]);
      if (!cur.rows.length) return res.status(404).json({ error: '장바구니에 없음' });
      next = cur.rows[0].quantity + Number(req.body?.delta || 0);
    }
    if (next <= 0) {
      await pool.query(`DELETE FROM shop_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, pid]);
    } else {
      await pool.query(`UPDATE shop_cart SET quantity=$1 WHERE user_id=$2 AND product_id=$3`, [next, req.user.id, pid]);
    }
    res.json(await getCart(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '수량 변경 실패', detail: err.message });
  }
});

// 삭제
app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM shop_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, Number(req.params.productId)]);
    res.json(await getCart(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '삭제 실패', detail: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3002;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 쇼핑몰 http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   루트 .env 의 DATABASE_URL(Supabase) 을 확인하세요.');
    process.exit(1);
  });
