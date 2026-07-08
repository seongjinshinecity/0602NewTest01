// QUARTER STORE — 쇼핑몰 완성판 (6주차 [Payment+File] 퀘스트)
// 5주차 [Auth+DB] 쇼핑몰 + ① ImageKit 이미지 업로드(관리자) ② 토스페이먼츠 결제 ③ 마이페이지
// 로컬(server.js)과 Vercel(api/index.js) 양쪽에서 이 app 을 공유한다.
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './lib/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from './lib/auth.js';
import { imagekitReady, uploadToImageKit } from './lib/imagekit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOSS_CLIENT_KEY = (process.env.TOSS_CLIENT_KEY || '').trim();
const TOSS_SECRET_KEY = (process.env.TOSS_SECRET_KEY || '').trim();

// 샘플 상품 (5주차와 동일 10종 + 결제 테스트용 100원 상품)
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
  ['🧪 결제 테스트 상품', 100, 'photo-1607083206968-13611e3d76db', '100원 테스트 결제용. 실제 돈이 나가지 않는 테스트 키 전용 상품.'],
];

let dbReady = null;
export function initDb() {
  dbReady ??= (async () => {
    await ensureAuthTable();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mall_products (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT          NOT NULL,
        price       NUMERIC(12,0) NOT NULL CHECK (price >= 0),
        image_url   TEXT          NOT NULL DEFAULT '',
        description TEXT          NOT NULL DEFAULT ''
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mall_cart (
        id         BIGSERIAL PRIMARY KEY,
        user_id    BIGINT  NOT NULL REFERENCES mall_users(id) ON DELETE CASCADE,
        product_id BIGINT  NOT NULL REFERENCES mall_products(id) ON DELETE CASCADE,
        quantity   INT     NOT NULL DEFAULT 1 CHECK (quantity > 0),
        UNIQUE (user_id, product_id)
      );
    `);
    // 주문 — 토스 orderId 기준. 승인 전 PENDING → 승인 후 PAID (서버 금액 검증의 근거 레코드)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mall_orders (
        id          BIGSERIAL PRIMARY KEY,
        order_id    TEXT UNIQUE NOT NULL,
        user_id     BIGINT NOT NULL REFERENCES mall_users(id) ON DELETE CASCADE,
        amount      NUMERIC(12,0) NOT NULL CHECK (amount >= 0),
        status      TEXT NOT NULL DEFAULT 'PENDING',
        payment_key TEXT NOT NULL DEFAULT '',
        method      TEXT NOT NULL DEFAULT '',
        order_name  TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        paid_at     TIMESTAMPTZ
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mall_order_items (
        id         BIGSERIAL PRIMARY KEY,
        order_pk   BIGINT NOT NULL REFERENCES mall_orders(id) ON DELETE CASCADE,
        product_id BIGINT REFERENCES mall_products(id) ON DELETE SET NULL,
        name       TEXT NOT NULL,
        price      NUMERIC(12,0) NOT NULL,
        quantity   INT NOT NULL CHECK (quantity > 0),
        image_url  TEXT NOT NULL DEFAULT ''
      );
    `);
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM mall_products`);
    if (rows[0].n === 0) {
      for (const [name, price, photo, desc] of SEED) {
        const url = `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=70`;
        await pool.query(
          `INSERT INTO mall_products (name, price, image_url, description) VALUES ($1,$2,$3,$4)`,
          [name, price, url, desc]
        );
      }
      console.log('🛍️  샘플 상품 시드 완료');
    } else {
      // 기존 5주차 DB 재사용 시 테스트 상품이 없으면 추가
      const t = await pool.query(`SELECT 1 FROM mall_products WHERE name LIKE '%결제 테스트 상품%'`);
      if (!t.rows.length) {
        const [name, price, photo, desc] = SEED[SEED.length - 1];
        await pool.query(
          `INSERT INTO mall_products (name, price, image_url, description) VALUES ($1,$2,$3,$4)`,
          [name, price, `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=70`, desc]
        );
      }
    }
    console.log('✅ products / cart / orders 테이블 준비 완료');
  })();
  return dbReady;
}

// ── 관리자 판별: ADMIN_EMAILS(콤마 구분) 포함 이메일, 미설정 시 user id 1
function isAdmin(user) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.length) return list.includes(String(user.email).toLowerCase());
  return Number(user.id) === 1;
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: '관리자만 사용할 수 있습니다' });
    next();
  });
}

export const app = express();
app.use(express.json({ limit: '10mb' })); // 이미지 base64 업로드 허용
app.use(express.static(path.join(__dirname, 'public'))); // 루트(index.html) = 카페 인트로, 쇼핑몰은 /shop.html
app.use(async (_req, _res, next) => { try { await initDb(); next(); } catch (e) { next(e); } }); // Vercel 콜드스타트 대비 lazy init

registerAuthRoutes(app);

// 프론트 설정 (공개 가능한 값만!)
app.get('/api/config', (req, res) => {
  res.json({ tossClientKey: TOSS_CLIENT_KEY, imagekitReady: imagekitReady() });
});

// ── 상품 (공개)
app.get('/api/products', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, price::float8 AS price, image_url, description FROM mall_products ORDER BY id`
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '상품 조회 실패', detail: err.message });
  }
});

// ── 장바구니 (로그인 본인만)
async function getCart(userId) {
  const r = await pool.query(
    `SELECT c.product_id, c.quantity, p.name, p.price::float8 AS price, p.image_url,
            (c.quantity * p.price)::float8 AS line_total
       FROM mall_cart c JOIN mall_products p ON p.id = c.product_id
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
  try { res.json(await getCart(req.user.id)); }
  catch (err) { console.error(err); res.status(500).json({ error: '장바구니 조회 실패', detail: err.message }); }
});

app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.body?.product_id);
    const qty = Math.max(1, Number(req.body?.quantity) || 1);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'product_id 가 필요합니다' });
    const exists = await pool.query(`SELECT 1 FROM mall_products WHERE id = $1`, [productId]);
    if (!exists.rows.length) return res.status(404).json({ error: '존재하지 않는 상품' });
    await pool.query(
      `INSERT INTO mall_cart (user_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = mall_cart.quantity + EXCLUDED.quantity`,
      [req.user.id, productId, qty]
    );
    res.status(201).json(await getCart(req.user.id));
  } catch (err) { console.error(err); res.status(500).json({ error: '담기 실패', detail: err.message }); }
});

app.patch('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const pid = Number(req.params.productId);
    let next;
    if (req.body?.quantity != null) next = Number(req.body.quantity);
    else {
      const cur = await pool.query(`SELECT quantity FROM mall_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, pid]);
      if (!cur.rows.length) return res.status(404).json({ error: '장바구니에 없음' });
      next = cur.rows[0].quantity + Number(req.body?.delta || 0);
    }
    if (next <= 0) await pool.query(`DELETE FROM mall_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, pid]);
    else await pool.query(`UPDATE mall_cart SET quantity=$1 WHERE user_id=$2 AND product_id=$3`, [next, req.user.id, pid]);
    res.json(await getCart(req.user.id));
  } catch (err) { console.error(err); res.status(500).json({ error: '수량 변경 실패', detail: err.message }); }
});

app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM mall_cart WHERE user_id=$1 AND product_id=$2`, [req.user.id, Number(req.params.productId)]);
    res.json(await getCart(req.user.id));
  } catch (err) { console.error(err); res.status(500).json({ error: '삭제 실패', detail: err.message }); }
});

// ── Part 2-1. 체크아웃 생성 — 금액은 반드시 서버가 장바구니로 계산 (프론트 금액 신뢰 금지)
app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const cart = await getCart(req.user.id);
    if (!cart.items.length) return res.status(400).json({ error: '장바구니가 비어 있습니다' });

    const orderId = `order_${crypto.randomUUID().replaceAll('-', '')}`;
    const orderName = cart.items.length === 1
      ? cart.items[0].name
      : `${cart.items[0].name} 외 ${cart.items.length - 1}건`;

    const o = await pool.query(
      `INSERT INTO mall_orders (order_id, user_id, amount, status, order_name)
       VALUES ($1,$2,$3,'PENDING',$4) RETURNING id`,
      [orderId, req.user.id, cart.total, orderName]
    );
    for (const i of cart.items) {
      await pool.query(
        `INSERT INTO mall_order_items (order_pk, product_id, name, price, quantity, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [o.rows[0].id, i.product_id, i.name, i.price, i.quantity, i.image_url]
      );
    }
    res.status(201).json({
      orderId, orderName,
      amount: cart.total,
      customerKey: `cust_${req.user.id}`,
      customerEmail: req.user.email,
      customerName: req.user.display_name || req.user.email,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: '체크아웃 생성 실패', detail: err.message }); }
});

// ── Part 2-2. 결제 승인 — 시크릿 키는 여기(서버)에서만 사용
app.post('/api/payments/confirm', requireAuth, async (req, res) => {
  try {
    const { paymentKey, orderId, amount } = req.body || {};
    if (!paymentKey || !orderId || amount == null) return res.status(400).json({ error: 'paymentKey / orderId / amount 가 필요합니다' });
    if (!TOSS_SECRET_KEY) return res.status(500).json({ error: 'TOSS_SECRET_KEY 가 설정되지 않았습니다' });

    const o = await pool.query(
      `SELECT id, amount::float8 AS amount, status FROM mall_orders WHERE order_id=$1 AND user_id=$2`,
      [orderId, req.user.id]
    );
    if (!o.rows.length) return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
    const order = o.rows[0];
    if (order.status === 'PAID') return res.json({ ok: true, alreadyPaid: true, orderId }); // 새로고침 등 중복 승인 방지

    // 서버 저장 금액과 결제 금액 대조 — 금액 위·변조 차단
    if (Number(amount) !== Number(order.amount)) {
      return res.status(400).json({ error: `금액 불일치 (주문 ${order.amount}원 ≠ 결제 ${amount}원)` });
    }

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });
    const pay = await tossRes.json().catch(() => ({}));
    if (!tossRes.ok) {
      console.error('토스 승인 실패:', pay);
      return res.status(tossRes.status).json({ error: pay.message || '결제 승인 실패', code: pay.code });
    }

    await pool.query(
      `UPDATE mall_orders SET status='PAID', payment_key=$1, method=$2, paid_at=$3 WHERE id=$4`,
      [paymentKey, pay.method || '', pay.approvedAt || new Date().toISOString(), order.id]
    );
    await pool.query(`DELETE FROM mall_cart WHERE user_id=$1`, [req.user.id]); // 결제 완료 → 장바구니 비움

    res.json({ ok: true, orderId, method: pay.method, approvedAt: pay.approvedAt, totalAmount: pay.totalAmount });
  } catch (err) { console.error(err); res.status(500).json({ error: '결제 승인 처리 실패', detail: err.message }); }
});

// ── Part 3. 마이페이지 — 반드시 user_id 필터 (본인 주문만)
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.order_id, o.amount::float8 AS amount, o.status, o.method, o.order_name, o.paid_at,
              COALESCE(json_agg(json_build_object(
                'name', i.name, 'price', i.price::float8, 'quantity', i.quantity, 'image_url', i.image_url
              ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
         FROM mall_orders o
         LEFT JOIN mall_order_items i ON i.order_pk = o.id
        WHERE o.user_id = $1 AND o.status = 'PAID'
        GROUP BY o.id
        ORDER BY o.paid_at DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: '주문 조회 실패', detail: err.message }); }
});

// ── Part 1. 관리자 — 상품 등록 + ImageKit 이미지 업로드
app.get('/api/admin/me', requireAuth, (req, res) => res.json({ admin: isAdmin(req.user) }));

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const price = Number(req.body?.price);
    const description = String(req.body?.description || '').trim();
    const imageBase64 = req.body?.imageBase64; // "data:image/...;base64,..."
    const fileName = String(req.body?.fileName || '').trim();
    if (!name) return res.status(400).json({ error: '상품명을 입력하세요' });
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: '가격이 올바르지 않습니다' });

    let imageUrl = '';
    if (imageBase64) imageUrl = await uploadToImageKit(imageBase64, fileName || `${name}.jpg`);

    const r = await pool.query(
      `INSERT INTO mall_products (name, price, image_url, description)
       VALUES ($1,$2,$3,$4) RETURNING id, name, price::float8 AS price, image_url, description`,
      [name, price, imageUrl, description]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: '상품 등록 실패', detail: err.message }); }
});

// 기존 상품 이미지 교체 (업로드 → URL 저장)
app.patch('/api/admin/products/:id/image', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const imageBase64 = req.body?.imageBase64;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 가 필요합니다' });
    const url = await uploadToImageKit(imageBase64, req.body?.fileName || `product-${id}.jpg`);
    const r = await pool.query(
      `UPDATE mall_products SET image_url=$1 WHERE id=$2 RETURNING id, name, image_url`,
      [url, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: '상품이 없습니다' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: '이미지 교체 실패', detail: err.message }); }
});
