import { app, initDb } from './app.js';
const PORT = Number(process.env.PORT) || 3030;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🥕 당근 클론 http://localhost:${PORT}`)))
  .catch((err) => { console.error('❌ DB 초기화 실패:', err.message); process.exit(1); });
