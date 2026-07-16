// 🥕 당근마켓 클론 — [Final] 7주차 파이널 퀘스트
// = (1) 글쓰기(상품 등록) + (2) 이미지 업로드(ImageKit) + (3) 1:1 채팅(폴링) 의 합성
// 스택: Express + Supabase Postgres(pg) + ImageKit — 5~6주차 쇼핑몰/대시보드 구조 재사용
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './lib/db.js';
import { ensureAuthTable, registerAuthRoutes, requireAuth } from './lib/auth.js';
import { imagekitReady, uploadToImageKit } from './lib/imagekit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = ['디지털기기', '가구/인테리어', '의류', '생활가전', '도서', '스포츠/레저', '기타'];

async function ensureTables() {
  await ensureAuthTable(); // mall_users (공용 인증 테이블)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS karrot_profiles (
      user_id      BIGINT PRIMARY KEY REFERENCES mall_users(id),
      neighborhood TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS karrot_products (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT NOT NULL REFERENCES mall_users(id),
      title       TEXT   NOT NULL,
      price       INT    NOT NULL CHECK (price >= 0),
      description TEXT   NOT NULL DEFAULT '',
      category    TEXT   NOT NULL DEFAULT '기타',
      status      TEXT   NOT NULL DEFAULT '판매중',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_karrot_products_created ON karrot_products (created_at DESC);
    CREATE TABLE IF NOT EXISTS karrot_product_images (
      id         BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES karrot_products(id) ON DELETE CASCADE,
      url        TEXT   NOT NULL,
      ord        INT    NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS karrot_favorites (
      user_id    BIGINT NOT NULL REFERENCES mall_users(id),
      product_id BIGINT NOT NULL REFERENCES karrot_products(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS karrot_chats (
      id         BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES karrot_products(id) ON DELETE CASCADE,
      buyer_id   BIGINT NOT NULL REFERENCES mall_users(id),
      seller_id  BIGINT NOT NULL REFERENCES mall_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (product_id, buyer_id)
    );
    CREATE TABLE IF NOT EXISTS karrot_messages (
      id         BIGSERIAL PRIMARY KEY,
      chat_id    BIGINT NOT NULL REFERENCES karrot_chats(id) ON DELETE CASCADE,
      sender_id  BIGINT NOT NULL REFERENCES mall_users(id),
      content    TEXT   NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_karrot_messages_chat ON karrot_messages (chat_id, id);
  `);
}

let dbReady = null;
export function initDb() {
  dbReady ??= ensureTables();
  return dbReady;
}

export const app = express();
app.use(express.json({ limit: '15mb' })); // 이미지 base64 업로드 (최대 3장)
app.use(express.static(path.join(__dirname, 'public')));
app.use(async (_req, _res, next) => { try { await initDb(); next(); } catch (e) { next(e); } });

registerAuthRoutes(app); // /api/auth/{register,login,logout,me}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };

// ── 프로필 (동네 설정) ─────────────────────────────────────────
app.post('/api/profile', requireAuth, async (req, res) => {
  try {
    const neighborhood = String(req.body?.neighborhood || '').trim();
    if (!neighborhood) return res.status(400).json({ error: '동네를 입력해주세요 (예: 성수동)' });
    await pool.query(
      `INSERT INTO karrot_profiles (user_id, neighborhood) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET neighborhood = $2`,
      [req.user.id, neighborhood]);
    res.json({ neighborhood });
  } catch (err) { console.error(err); res.status(500).json({ error: '동네 설정 실패', detail: err.message }); }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  const { rows: [p] } = await pool.query(`SELECT neighborhood FROM karrot_profiles WHERE user_id = $1`, [req.user.id]);
  res.json({ neighborhood: p?.neighborhood ?? '' });
});

// ── 상품 ──────────────────────────────────────────────────────
app.get('/api/categories', (_req, res) => res.json({ categories: CATEGORIES }));

// 목록: 최신순 + 카테고리 필터 + 키워드 검색
app.get('/api/products', async (req, res) => {
  try {
    const cond = ['1=1']; const params = [];
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      params.push(req.query.category); cond.push(`p.category = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q).trim()}%`); cond.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.price, p.category, p.status, p.created_at,
              u.display_name AS seller, COALESCE(pr.neighborhood, '') AS neighborhood,
              (SELECT url FROM karrot_product_images i WHERE i.product_id = p.id ORDER BY ord LIMIT 1) AS thumb,
              (SELECT COUNT(*)::int FROM karrot_favorites f WHERE f.product_id = p.id) AS favorites
       FROM karrot_products p
       JOIN mall_users u ON u.id = p.user_id
       LEFT JOIN karrot_profiles pr ON pr.user_id = p.user_id
       WHERE ${cond.join(' AND ')}
       ORDER BY p.created_at DESC LIMIT 60`, params);
    res.json({ products: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '목록 조회 실패', detail: err.message }); }
});

// 등록: 제목 + 가격 + 설명 + 카테고리 + 이미지(최대 3장, dataURL)
app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const category = CATEGORIES.includes(req.body?.category) ? req.body.category : '기타';
    const price = num(req.body?.price);
    const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : [];
    if (!title) return res.status(400).json({ error: '제목을 입력해주세요' });
    if (!Number.isInteger(price) || price < 0) return res.status(400).json({ error: '가격을 확인해주세요' });
    if (!images.length) return res.status(400).json({ error: '사진을 1장 이상 올려주세요' });
    if (!imagekitReady()) return res.status(500).json({ error: '이미지 서버 설정이 없습니다 (IMAGEKIT_* env)' });

    const urls = [];
    for (const [i, dataUrl] of images.entries()) {
      urls.push(await uploadToImageKit(String(dataUrl), `karrot-${Date.now()}-${i}.jpg`));
    }
    const { rows: [p] } = await pool.query(
      `INSERT INTO karrot_products (user_id, title, price, description, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, title, price, description, category]);
    for (const [i, url] of urls.entries()) {
      await pool.query(`INSERT INTO karrot_product_images (product_id, url, ord) VALUES ($1, $2, $3)`, [p.id, url, i]);
    }
    res.status(201).json({ id: p.id });
  } catch (err) { console.error(err); res.status(500).json({ error: '상품 등록 실패', detail: err.message }); }
});

// 상세
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = num(req.params.id);
    const { rows: [p] } = await pool.query(
      `SELECT p.*, u.display_name AS seller, COALESCE(pr.neighborhood, '') AS neighborhood
       FROM karrot_products p JOIN mall_users u ON u.id = p.user_id
       LEFT JOIN karrot_profiles pr ON pr.user_id = p.user_id WHERE p.id = $1`, [id]);
    if (!p) return res.status(404).json({ error: '상품이 없습니다' });
    const [{ rows: images }, { rows: [fav] }] = await Promise.all([
      pool.query(`SELECT url FROM karrot_product_images WHERE product_id = $1 ORDER BY ord`, [id]),
      pool.query(`SELECT COUNT(*)::int AS n FROM karrot_favorites WHERE product_id = $1`, [id]),
    ]);
    res.json({ product: { ...p, images: images.map((r) => r.url), favorites: fav.n } });
  } catch (err) { console.error(err); res.status(500).json({ error: '상세 조회 실패', detail: err.message }); }
});

// 수정/삭제 — 본인만 (user_id 조건으로 소유권 강제)
app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const id = num(req.params.id);
    const status = ['판매중', '예약중', '판매완료'].includes(req.body?.status) ? req.body.status : null;
    const fields = []; const params = [];
    if (req.body?.title) { params.push(String(req.body.title).trim()); fields.push(`title = $${params.length}`); }
    if (req.body?.price !== undefined) {
      const price = num(req.body.price);
      if (!Number.isInteger(price) || price < 0) return res.status(400).json({ error: '가격을 확인해주세요' });
      params.push(price); fields.push(`price = $${params.length}`);
    }
    if (req.body?.description !== undefined) { params.push(String(req.body.description).trim()); fields.push(`description = $${params.length}`); }
    if (status) { params.push(status); fields.push(`status = $${params.length}`); }
    if (!fields.length) return res.status(400).json({ error: '수정할 내용이 없습니다' });
    params.push(id, req.user.id);
    const { rowCount } = await pool.query(
      `UPDATE karrot_products SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length}`, params);
    if (!rowCount) return res.status(403).json({ error: '본인 상품만 수정할 수 있습니다' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: '수정 실패', detail: err.message }); }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM karrot_products WHERE id = $1 AND user_id = $2`, [num(req.params.id), req.user.id]);
    if (!rowCount) return res.status(403).json({ error: '본인 상품만 삭제할 수 있습니다' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: '삭제 실패', detail: err.message }); }
});

// 관심(찜) 토글
app.post('/api/products/:id/favorite', requireAuth, async (req, res) => {
  try {
    const id = num(req.params.id);
    const { rowCount } = await pool.query(
      `DELETE FROM karrot_favorites WHERE user_id = $1 AND product_id = $2`, [req.user.id, id]);
    if (!rowCount) await pool.query(
      `INSERT INTO karrot_favorites (user_id, product_id) VALUES ($1, $2)`, [req.user.id, id]);
    const { rows: [fav] } = await pool.query(`SELECT COUNT(*)::int AS n FROM karrot_favorites WHERE product_id = $1`, [id]);
    res.json({ liked: !rowCount, favorites: fav.n });
  } catch (err) { console.error(err); res.status(500).json({ error: '관심 처리 실패', detail: err.message }); }
});

// ── 1:1 채팅 (Polling) ────────────────────────────────────────
// 상품 상세에서 "채팅하기" → 구매자-판매자 채팅방 생성(있으면 재사용)
app.post('/api/products/:id/chat', requireAuth, async (req, res) => {
  try {
    const id = num(req.params.id);
    const { rows: [p] } = await pool.query(`SELECT user_id FROM karrot_products WHERE id = $1`, [id]);
    if (!p) return res.status(404).json({ error: '상품이 없습니다' });
    if (p.user_id === req.user.id) return res.status(400).json({ error: '내 상품에는 채팅할 수 없습니다' });
    const { rows: [chat] } = await pool.query(
      `INSERT INTO karrot_chats (product_id, buyer_id, seller_id) VALUES ($1, $2, $3)
       ON CONFLICT (product_id, buyer_id) DO UPDATE SET product_id = EXCLUDED.product_id
       RETURNING id`, [id, req.user.id, p.user_id]);
    res.json({ chatId: chat.id });
  } catch (err) { console.error(err); res.status(500).json({ error: '채팅방 생성 실패', detail: err.message }); }
});

// 내 채팅 목록 (구매자/판매자 양쪽)
app.get('/api/chats', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.product_id, p.title, p.price,
              (SELECT url FROM karrot_product_images i WHERE i.product_id = p.id ORDER BY ord LIMIT 1) AS thumb,
              CASE WHEN c.buyer_id = $1 THEN su.display_name ELSE bu.display_name END AS partner,
              (SELECT content FROM karrot_messages m WHERE m.chat_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM karrot_messages m WHERE m.chat_id = c.id ORDER BY id DESC LIMIT 1) AS last_at
       FROM karrot_chats c
       JOIN karrot_products p ON p.id = c.product_id
       JOIN mall_users bu ON bu.id = c.buyer_id
       JOIN mall_users su ON su.id = c.seller_id
       WHERE c.buyer_id = $1 OR c.seller_id = $1
       ORDER BY COALESCE((SELECT created_at FROM karrot_messages m WHERE m.chat_id = c.id ORDER BY id DESC LIMIT 1), c.created_at) DESC`,
      [req.user.id]);
    res.json({ chats: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '채팅 목록 실패', detail: err.message }); }
});

// 채팅방 접근 권한 체크
async function getChatIfMember(chatId, userId) {
  const { rows: [c] } = await pool.query(
    `SELECT c.*, p.title, p.price,
            bu.display_name AS buyer_name, su.display_name AS seller_name
     FROM karrot_chats c
     JOIN karrot_products p ON p.id = c.product_id
     JOIN mall_users bu ON bu.id = c.buyer_id
     JOIN mall_users su ON su.id = c.seller_id
     WHERE c.id = $1`, [chatId]);
  if (!c || (c.buyer_id !== userId && c.seller_id !== userId)) return null;
  return c;
}

// 메시지 조회 — ?after=<마지막 메시지 id> 로 폴링 (주기적으로 DB 변화 체크)
app.get('/api/chats/:id/messages', requireAuth, async (req, res) => {
  try {
    const c = await getChatIfMember(num(req.params.id), req.user.id);
    if (!c) return res.status(403).json({ error: '참여한 채팅방이 아닙니다' });
    const after = num(req.query.after) || 0;
    const { rows } = await pool.query(
      `SELECT id, sender_id, content, created_at FROM karrot_messages
       WHERE chat_id = $1 AND id > $2 ORDER BY id LIMIT 100`, [c.id, after]);
    res.json({
      chat: { id: c.id, title: c.title, price: c.price,
              partner: c.buyer_id === req.user.id ? c.seller_name : c.buyer_name },
      messages: rows, me: req.user.id,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: '메시지 조회 실패', detail: err.message }); }
});

app.post('/api/chats/:id/messages', requireAuth, async (req, res) => {
  try {
    const c = await getChatIfMember(num(req.params.id), req.user.id);
    if (!c) return res.status(403).json({ error: '참여한 채팅방이 아닙니다' });
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: '메시지를 입력해주세요' });
    const { rows: [m] } = await pool.query(
      `INSERT INTO karrot_messages (chat_id, sender_id, content) VALUES ($1, $2, $3)
       RETURNING id, sender_id, content, created_at`, [c.id, req.user.id, content]);
    res.status(201).json({ message: m });
  } catch (err) { console.error(err); res.status(500).json({ error: '전송 실패', detail: err.message }); }
});

// ── 마이페이지 ────────────────────────────────────────────────
app.get('/api/me/products', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.price, p.status, p.created_at,
            (SELECT url FROM karrot_product_images i WHERE i.product_id = p.id ORDER BY ord LIMIT 1) AS thumb
     FROM karrot_products p WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ products: rows });
});

app.get('/api/me/favorites', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.price, p.status,
            (SELECT url FROM karrot_product_images i WHERE i.product_id = p.id ORDER BY ord LIMIT 1) AS thumb
     FROM karrot_favorites f JOIN karrot_products p ON p.id = f.product_id
     WHERE f.user_id = $1 ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ products: rows });
});
