// 공유 인증 모듈 — 이메일/비밀번호 회원가입·로그인.
// bcrypt 해시 + HMAC 서명 세션 토큰(httpOnly 쿠키). 무상태(stateless)라 세션 테이블 불필요.
//
// ※ 퀘스트 가이드는 "Supabase Auth"를 권장하지만, 이 레포는 pg 로 Postgres 에 직접
//   붙는 패턴이라 동일 스택을 유지하려고 앱 레벨 인증으로 구현했다. 소유권(본인 글만
//   수정/삭제)은 user_id 외래키 + SQL 조건으로 강제하므로 학습 목표(권한 분기)는 충족한다.
//   Supabase Auth 로 바꾸려면 이 한 파일만 교체하면 된다.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const SECRET = (process.env.SESSION_SECRET || 'week5-2-dev-secret').trim();
const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7일(초)

// app_users 테이블 보장 (모든 인증 앱 공용)
export async function ensureAuthTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id            BIGSERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT        NOT NULL,
      display_name  TEXT        NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function makeToken(user) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = b64u(JSON.stringify({ uid: user.id, email: user.email, name: user.display_name, exp }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  if (sign(payload) !== mac) return null; // 변조 검출
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null; // 만료
    return { id: data.uid, email: data.email, display_name: data.name };
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// req.user 채우기(선택). 로그인 안 했으면 null.
export function attachUser(req, _res, next) {
  req.user = verifyToken(parseCookies(req)[COOKIE]);
  next();
}

// 로그인 필수 게이트
export function requireAuth(req, res, next) {
  const user = verifyToken(parseCookies(req)[COOKIE]);
  if (!user) return res.status(401).json({ error: '로그인이 필요합니다' });
  req.user = user;
  next();
}

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

// 인증 라우트 일괄 등록: /api/auth/{register,login,logout,me}
export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim() || email.split('@')[0];
      if (!isEmail(email)) return res.status(400).json({ error: '올바른 이메일을 입력하세요' });
      if (password.length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다' });

      const hash = await bcrypt.hash(password, 10);
      let row;
      try {
        const r = await pool.query(
          `INSERT INTO app_users (email, password_hash, display_name)
           VALUES ($1, $2, $3) RETURNING id, email, display_name`,
          [email, hash, name]
        );
        row = r.rows[0];
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: '이미 가입된 이메일입니다' });
        throw e;
      }
      setSessionCookie(res, makeToken(row));
      res.status(201).json({ id: row.id, email: row.email, name: row.display_name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '회원가입 실패', detail: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const r = await pool.query(
        `SELECT id, email, password_hash, display_name FROM app_users WHERE email = $1`,
        [email]
      );
      const u = r.rows[0];
      if (!u || !(await bcrypt.compare(password, u.password_hash))) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
      }
      setSessionCookie(res, makeToken(u));
      res.json({ id: u.id, email: u.email, name: u.display_name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '로그인 실패', detail: err.message });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = verifyToken(parseCookies(req)[COOKIE]);
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user.id, email: user.email, name: user.display_name } });
  });
}
