import { app, initDb } from './app.js';
const PORT = Number(process.env.PORT) || 3020;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 사장님 대시보드 http://localhost:${PORT}`)))
  .catch((err) => { console.error('❌ DB 초기화 실패:', err.message); process.exit(1); });
