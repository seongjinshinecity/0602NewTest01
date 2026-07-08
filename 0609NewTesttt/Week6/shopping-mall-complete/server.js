// 로컬 실행 진입점 — Vercel 은 api/index.js 를 쓴다.
import { app, initDb } from './app.js';

const PORT = Number(process.env.PORT) || 3010;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 쇼핑몰 완성판 http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('❌ DB 초기화 실패:', err.message);
    console.error('   .env 의 DATABASE_URL(Supabase) 을 확인하세요.');
    process.exit(1);
  });
