// 에이전트용 DB 쿼리 도구 — SQL 을 인자로 받아 결과를 JSON 으로 출력한다.
// 사용: node query.js "SELECT menu_name, SUM(amount) FROM cafe_sales GROUP BY 1"
// SELECT 전용(읽기 전용 가드). DATABASE_URL 은 .env 에서 읽는다.
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const sql = process.argv[2];
if (!sql) { console.error('사용법: node query.js "SELECT ..."'); process.exit(1); }
if (!/^\s*(select|with)\b/i.test(sql)) { console.error('SELECT/WITH 쿼리만 허용됩니다 (읽기 전용)'); process.exit(1); }

const pool = new pg.Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});
try {
  const r = await pool.query(sql);
  console.log(JSON.stringify(r.rows, null, 1));
} catch (e) {
  console.error('쿼리 실패:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
