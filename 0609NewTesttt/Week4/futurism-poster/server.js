// ============================================================
// ASCENSION 2099 — Futurism Poster · 한 줄 기대평 서버
// 단일 server.js (Express) · 로컬 + Vercel 듀얼 모드
// 데이터 저장: 같은 폴더의 reviews.json (외부 DB 없음)
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ----- 데이터 저장소 (JSON 파일) -----
const DATA_FILE = path.join(__dirname, 'reviews.json');
const MAX_LEN = 140;

function readReviews() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('reviews.json 읽기 실패:', err.message);
    return [];
  }
}

function writeReviews(reviews) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
}

// ----- 미들웨어 -----
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ----- API: 기대평 목록 (최신순) -----
app.get('/api/reviews', (_req, res) => {
  try {
    const reviews = readReviews().slice().sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '기대평을 불러오지 못했습니다.' });
  }
});

// ----- API: 기대평 등록 -----
app.post('/api/reviews', (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

    if (!text) {
      return res.status(400).json({ success: false, message: '기대평 내용을 입력해 주세요.' });
    }
    if (text.length > MAX_LEN) {
      return res.status(400).json({ success: false, message: `기대평은 ${MAX_LEN}자 이내로 입력해 주세요.` });
    }

    const reviews = readReviews();
    const review = {
      id: Date.now(),               // timestamp 기반 증가 id
      text,
      createdAt: new Date().toISOString(),
    };
    reviews.push(review);
    writeReviews(reviews);

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '기대평 저장에 실패했습니다.' });
  }
});

// ----- SPA fallback (Express 4 catch-all) -----
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ----- 로컬: 서버 시작 / Vercel: app export -----
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}
module.exports = app;
