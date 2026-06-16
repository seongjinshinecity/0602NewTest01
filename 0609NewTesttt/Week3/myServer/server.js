const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── In-memory data store ──────────────────────────────────────────────
let clickCount = 0;

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── API routes ────────────────────────────────────────────────────────
// 버튼 클릭 시 호출되는 간단한 엔드포인트
app.get('/api/hello', (_req, res) => {
  clickCount += 1;
  res.json({
    success: true,
    data: {
      message: '서버에서 응답이 도착했습니다! 👋',
      count: clickCount,
      time: new Date().toLocaleTimeString('ko-KR'),
    },
  });
});

// ── SPA fallback (Express 5 문법) ─────────────────────────────────────
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Local: start server / Vercel: export app ─────────────────────────
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
