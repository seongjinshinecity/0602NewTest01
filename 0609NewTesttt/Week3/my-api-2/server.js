const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── In-memory data store ──────────────────────────────────────────────
let clickCount = 0;

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Helpers ───────────────────────────────────────────────────────────
// 시간대에 맞는 인사말을 골라준다.
function pickGreeting(hour) {
  if (hour < 6) return '늦은 밤이네요, 무리하지 마세요 🌙';
  if (hour < 12) return '좋은 아침이에요! ☀️';
  if (hour < 18) return '좋은 오후예요! 🌤️';
  return '편안한 저녁 되세요 🌆';
}

// ── API routes ────────────────────────────────────────────────────────
// 버튼 클릭 시 호출 — 현재 시간 + 간단한 인사를 돌려준다.
app.get('/api/hello', (_req, res) => {
  clickCount += 1;
  const now = new Date();

  res.json({
    success: true,
    data: {
      greeting: pickGreeting(now.getHours()),
      time: now.toLocaleTimeString('ko-KR'),
      date: now.toLocaleDateString('ko-KR', { weekday: 'long' }),
      count: clickCount,
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
