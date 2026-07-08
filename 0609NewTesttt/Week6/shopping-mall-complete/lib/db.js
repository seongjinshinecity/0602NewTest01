// DB 연결 (pg → Supabase Postgres). 앱 루트의 .env 를 로드한다.
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(DATABASE_URL);

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
