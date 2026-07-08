// ============================================================
// SINGLE ORIGIN — 백엔드 서버 (Express)
//  A) 정적 파일 서빙 (index.html 등)
//  B) 토스페이먼츠 결제 승인   : /api/orders, /api/confirm       (TOSS_SECRET_KEY)
//  C) 서버 자체 인증(Postgres) : /api/auth/*, /api/me, /api/me/avatar
//     - Supabase Auth 를 쓰지 않고, Postgres(DATABASE_URL)에 직접 붙어 bcrypt+JWT 세션.
//     - users / profiles(avatar_url) 테이블은 기동 시 CREATE TABLE IF NOT EXISTS 로 자동 생성.
//  D) ImageKit 업로드 서명     : /api/imagekit-auth              (IMAGEKIT_PRIVATE_KEY)
//
//  ⚠️ 모든 비밀(시크릿 키/DB 접속문자열/ImageKit private 키)은 .env 에서만 읽습니다.
// ============================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- 결제(토스) ---
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

// --- 인증(Postgres + JWT) ---
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'bean-shop-dev-session-secret-change-me';
const COOKIE = 'bean_session';
let pool = null;
let dbReady = false;

// --- ImageKit ---
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/placeholder';
let imagekit = null;
if (IMAGEKIT_PRIVATE_KEY && IMAGEKIT_PUBLIC_KEY) {
  const ImageKit = require('imagekit');
  imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
}

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname)); // 해시 라우팅이라 서버는 '/'만 응답하면 됨

// ============================================================
// DB 초기화 (기동 시 1회) — 실패해도 서버는 뜨고, 인증만 비활성화됨
// ============================================================
async function initDb() {
  if (!DATABASE_URL) { console.warn('⚠️  DATABASE_URL 미설정 — 로그인/프로필 비활성화(쇼핑·결제는 정상).'); return; }
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  // Supabase 풀러는 유휴 커넥션을 끊는다 → idle client 에러가 프로세스를 죽이지 않도록 흡수
  pool.on('error', (err) => { console.warn('pg pool idle error (무시):', err.message); });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_profiles (
      user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      avatar_url text,
      updated_at timestamptz DEFAULT now()
    );
    -- 주문: 앞의 Supabase orders(구스키마)와 충돌 피하려 app_ 접두사 사용
    CREATE TABLE IF NOT EXISTS app_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id text UNIQUE NOT NULL,                 -- 토스 orderId
      user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      order_name text,
      amount integer NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',        -- PENDING → DONE
      payment_key text,
      method text,
      paid_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_ref uuid REFERENCES app_orders(id) ON DELETE CASCADE,
      product_name text NOT NULL,
      qty integer NOT NULL,
      unit_price integer NOT NULL
    );
  `);
  dbReady = true;
  console.log('   DB 연결 + 테이블(app_users/app_profiles/app_orders/app_order_items) 준비 완료.');
}

// ============================================================
// 인증 유틸
// ============================================================
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, SESSION_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
}
function currentUserId(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, SESSION_SECRET).uid; } catch (e) { return null; }
}

// 클라이언트가 배너/활성화 판단에 사용
app.get('/api/config', (req, res) => {
  res.json({ authEnabled: dbReady, imagekitEnabled: !!imagekit });
});

app.post('/api/auth/signup', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드가 설정되지 않았습니다. (DATABASE_URL)' });
  const { email, password } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: '올바른 이메일을 입력해주세요.' });
  if (!password || password.length < 6) return res.status(400).json({ code: 'WEAK_PASSWORD', message: '비밀번호는 6자 이상이어야 합니다.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), hash]
    );
    const user = rows[0];
    await pool.query('INSERT INTO app_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    setSession(res, user.id);
    res.json({ user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ code: 'EMAIL_TAKEN', message: '이미 가입된 이메일이에요. 로그인해주세요.' });
    res.status(500).json({ code: 'SIGNUP_FAILED', message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드가 설정되지 않았습니다. (DATABASE_URL)' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ code: 'INVALID_REQUEST', message: '이메일과 비밀번호가 필요합니다.' });
  try {
    const { rows } = await pool.query('SELECT id, email, password_hash FROM app_users WHERE email = $1', [String(email).toLowerCase()]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return res.status(401).json({ code: 'BAD_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않아요.' });
    }
    setSession(res, u.id);
    res.json({ user: { id: u.id, email: u.email } });
  } catch (e) {
    res.status(500).json({ code: 'LOGIN_FAILED', message: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드 미설정' });
  const uid = currentUserId(req);
  if (!uid) return res.status(401).json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' });
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, p.avatar_url
         FROM app_users u LEFT JOIN app_profiles p ON p.user_id = u.id
        WHERE u.id = $1`, [uid]
    );
    if (!rows[0]) return res.status(401).json({ code: 'UNAUTHENTICATED', message: '세션이 만료되었습니다.' });
    const r = rows[0];
    res.json({ user: { id: r.id, email: r.email }, profile: { avatar_url: r.avatar_url } });
  } catch (e) {
    res.status(500).json({ code: 'ME_FAILED', message: e.message });
  }
});

app.post('/api/me/avatar', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드 미설정' });
  const uid = currentUserId(req);
  if (!uid) return res.status(401).json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' });
  const { avatarUrl } = req.body || {};
  if (!avatarUrl || typeof avatarUrl !== 'string') return res.status(400).json({ code: 'INVALID_URL', message: 'avatarUrl이 필요합니다.' });
  try {
    await pool.query(
      `INSERT INTO app_profiles (user_id, avatar_url, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = now()`,
      [uid, avatarUrl]
    );
    res.json({ profile: { avatar_url: avatarUrl } });
  } catch (e) {
    res.status(500).json({ code: 'AVATAR_SAVE_FAILED', message: e.message });
  }
});

// ============================================================
// ImageKit 업로드 서명 — 브라우저가 직접 업로드하도록 token/expire/signature 발급
// ============================================================
app.get('/api/imagekit-auth', (req, res) => {
  if (!imagekit) return res.status(500).json({ code: 'IMAGEKIT_NOT_CONFIGURED', message: 'ImageKit 키가 .env에 설정되지 않았습니다.' });
  const params = imagekit.getAuthenticationParameters();
  res.json({ ...params, publicKey: IMAGEKIT_PUBLIC_KEY });
});

// ============================================================
// 결제(토스) — 주문을 Postgres에 PENDING으로 저장 → 승인 성공 시 DONE
//  · 금액 검증은 DB에 저장된 기대 금액과 대조 (DB 없으면 in-memory 폴백)
//  · user_id는 세션 쿠키에서 서버가 도출 (위변조 불가)
// ============================================================
const orderAmounts = new Map(); // 폴백(DB off): orderId -> { amount }

app.post('/api/orders', async (req, res) => {
  const { orderId, amount, orderName, items } = req.body || {};
  if (!orderId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ code: 'INVALID_ORDER', message: 'orderId와 양수 amount가 필요합니다.' });
  }
  if (!dbReady) { orderAmounts.set(orderId, { amount }); return res.json({ ok: true, orderId }); }
  const uid = currentUserId(req); // 로그인했으면 주문에 연결
  try {
    const ins = await pool.query(
      `INSERT INTO app_orders (order_id, user_id, order_name, amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       ON CONFLICT (order_id) DO NOTHING
       RETURNING id`,
      [orderId, uid, orderName || '', amount]
    );
    if (ins.rows[0] && Array.isArray(items) && items.length) {
      const ref = ins.rows[0].id;
      for (const it of items) {
        await pool.query(
          `INSERT INTO app_order_items (order_ref, product_name, qty, unit_price) VALUES ($1, $2, $3, $4)`,
          [ref, String(it.name || '상품'), Number(it.qty) || 1, Number(it.unitPrice) || 0]
        );
      }
    }
    res.json({ ok: true, orderId });
  } catch (e) {
    res.status(500).json({ code: 'ORDER_SAVE_FAILED', message: e.message });
  }
});

app.post('/api/confirm', async (req, res) => {
  const { paymentKey, orderId, amount } = req.body || {};
  if (!paymentKey || !orderId || amount == null) {
    return res.status(400).json({ code: 'INVALID_REQUEST', message: 'paymentKey / orderId / amount 가 필요합니다.' });
  }
  if (!TOSS_SECRET_KEY) {
    return res.status(500).json({ code: 'SERVER_MISCONFIGURED', message: 'TOSS_SECRET_KEY가 설정되지 않았습니다. .env를 확인하세요.' });
  }

  // 1) 기대 금액 대조 (DB 우선, 없으면 in-memory)
  let expectedAmount = null;
  if (dbReady) {
    const r = await pool.query('SELECT amount FROM app_orders WHERE order_id = $1', [orderId]);
    if (r.rows[0]) expectedAmount = Number(r.rows[0].amount);
  } else if (orderAmounts.has(orderId)) {
    expectedAmount = Number(orderAmounts.get(orderId).amount);
  }
  if (expectedAmount == null) {
    return res.status(400).json({ code: 'ORDER_NOT_FOUND', message: '서버에 등록되지 않은 주문입니다. (/api/orders 선행 필요)' });
  }
  if (expectedAmount !== Number(amount)) {
    return res.status(400).json({ code: 'AMOUNT_MISMATCH', message: `결제 금액이 일치하지 않습니다. (기대 ${expectedAmount}원, 요청 ${amount}원)` });
  }

  // 2) 토스 승인
  let data, ok;
  try {
    const encoded = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });
    data = await tossRes.json();
    ok = tossRes.ok || data.code === 'ALREADY_PROCESSED_PAYMENT';
    if (!ok) return res.status(tossRes.status).json(data);
  } catch (e) {
    return res.status(502).json({ code: 'CONFIRM_REQUEST_FAILED', message: e.message });
  }

  // 3) 승인 성공 → 주문 DONE 처리 (멱등: 이미 DONE이면 그대로), 내부 주문 id 반환
  let order = null;
  if (dbReady) {
    try {
      await pool.query(
        `UPDATE app_orders
            SET status='DONE', payment_key=$2, method=$3, paid_at=COALESCE(paid_at, now())
          WHERE order_id=$1 AND status <> 'DONE'`,
        [orderId, paymentKey, data.method || null]
      );
      const r = await pool.query('SELECT id, order_id FROM app_orders WHERE order_id=$1', [orderId]);
      if (r.rows[0]) order = r.rows[0];
    } catch (e) {
      // 저장 실패해도 승인 자체는 성공 → 결과는 반환하되 로그만 남김
      console.warn('주문 DONE 처리 실패:', e.message);
    }
  }
  return res.status(200).json({ ...data, order });
});

// ============================================================
// 마이페이지 — 로그인 사용자의 주문 내역 (user_id 격리, 최신순)
// ============================================================
app.get('/api/me/orders', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드 미설정' });
  const uid = currentUserId(req);
  if (!uid) return res.status(401).json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' });
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_id, o.order_name, o.amount, o.status, o.paid_at, o.created_at,
              (SELECT count(*) FROM app_order_items i WHERE i.order_ref = o.id) AS item_count
         FROM app_orders o
        WHERE o.user_id = $1 AND o.status = 'DONE'
        ORDER BY o.paid_at DESC NULLS LAST, o.created_at DESC`,
      [uid]
    );
    res.json({ orders: rows });
  } catch (e) {
    res.status(500).json({ code: 'ORDERS_FAILED', message: e.message });
  }
});

app.get('/api/me/orders/:id', async (req, res) => {
  if (!dbReady) return res.status(503).json({ code: 'AUTH_DISABLED', message: '인증 백엔드 미설정' });
  const uid = currentUserId(req);
  if (!uid) return res.status(401).json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' });
  try {
    // user_id 격리: 남의 주문 id로 조회해도 안 나옴
    const o = await pool.query(
      `SELECT id, order_id, order_name, amount, status, payment_key, method, paid_at, created_at
         FROM app_orders WHERE id = $1 AND user_id = $2`,
      [req.params.id, uid]
    );
    if (!o.rows[0]) return res.status(404).json({ code: 'NOT_FOUND', message: '주문을 찾을 수 없습니다.' });
    const items = await pool.query(
      `SELECT product_name, qty, unit_price FROM app_order_items WHERE order_ref = $1 ORDER BY product_name`,
      [req.params.id]
    );
    res.json({ order: o.rows[0], items: items.rows });
  } catch (e) {
    res.status(500).json({ code: 'ORDER_DETAIL_FAILED', message: e.message });
  }
});

// ============================================================
// 기동
// ============================================================
(async () => {
  try { await initDb(); }
  catch (e) { console.warn('⚠️  DB 초기화 실패 — 로그인/프로필 비활성화:', e.message); }

  app.listen(PORT, () => {
    console.log(`\n☕ bean-shop 서버 실행 → http://localhost:${PORT}`);
    console.log(`   토스 결제:  ${TOSS_SECRET_KEY ? 'ON' : 'OFF (TOSS_SECRET_KEY 없음)'}`);
    console.log(`   자체 인증:  ${dbReady ? 'ON' : 'OFF (DATABASE_URL 없음/실패)'}`);
    console.log(`   ImageKit:   ${imagekit ? 'ON' : 'OFF (IMAGEKIT_PRIVATE_KEY 없음)'}`);
  });
})();
