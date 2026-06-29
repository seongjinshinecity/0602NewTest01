// 공유 DB 연결 (pg / node-postgres → Supabase Postgres)
// DATABASE_URL 은 Supabase pooler(...pooler.supabase.com:6543) 이며 SSL 을 강제한다.
// 단, localhost/127.0.0.1 로컬 Postgres 로 테스트할 때는 SSL 을 끈다.
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 모노레포 루트(.env)를 어느 앱에서 실행하든 로드
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(DATABASE_URL);

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function ping() {
  await pool.query('SELECT 1');
}
