// server.js — about-me 포트폴리오 + 근거 기반 Q&A 백엔드
//   (로컬 node + Vercel 서버리스 듀얼 모드)
//   데이터 소스: about-me2.md  → 답변은 오직 이 문서의 내용에만 근거하며,
//   문서에 없는 질문에는 "모릅니다"로 답한다. (about-me-qa-bot 동작 재현)
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// 미들웨어
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────
// about-me2.md 로드 (앱의 데이터 소스)
//   서버 시작 시 1회 읽고 메모리에 캐싱. 파일이 없으면 빈 문자열.
// ─────────────────────────────────────────────
function loadProfile() {
  try {
    return fs.readFileSync(path.join(__dirname, 'about-me2.md'), 'utf-8');
  } catch (err) {
    console.error('[about-me] about-me2.md 를 읽지 못했습니다:', err.message);
    return '';
  }
}
const PROFILE_MD = loadProfile();

// ─────────────────────────────────────────────
// Anthropic Claude API 호출 헬퍼 (근거 기반 Q&A)
// ─────────────────────────────────────────────
async function askAboutMe(question) {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  // API 키가 없을 경우: 데모용 폴백 (키 하드코딩 금지)
  if (!apiKey) {
    return {
      answer:
        `[데모 모드] 질문: "${question}"\n\n` +
        `실제 AI 답변을 받으시려면 서버 환경변수에 ANTHROPIC_API_KEY 를 설정해 주세요. ` +
        `설정하면 about-me2.md 문서의 내용에만 근거해, 문서에 없는 내용은 "모릅니다"로 답합니다.`,
      demo: true,
    };
  }

  const systemPrompt =
    `당신은 아래 마크다운 문서(about-me2.md)에 적힌 인물에 대해서만 답하는 Q&A 비서입니다.\n` +
    `규칙:\n` +
    `1. 반드시 아래 문서에 적힌 사실에만 근거해 한국어로 답하세요.\n` +
    `2. 문서에 근거가 없는 질문에는 추측하지 말고 정확히 "모릅니다" 라고만 답하세요.\n` +
    `3. 답변은 간결하고 친근한 문장으로 작성하고, 가능하면 문서의 표현을 활용하세요.\n` +
    `4. 마크다운 기호(#, *, - 등) 없이 매끄러운 문장으로만 답하세요.\n\n` +
    `─── about-me2.md 시작 ───\n${PROFILE_MD}\n─── about-me2.md 끝 ───`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API 오류 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = Array.isArray(data.content)
    ? data.content.find((b) => b.type === 'text')
    : null;

  return {
    answer: textBlock ? textBlock.text : '답변을 불러오지 못했습니다.',
    demo: false,
  };
}

// ─────────────────────────────────────────────
// API 라우트
// ─────────────────────────────────────────────

// 포트폴리오 데이터(about-me2.md 원문) 제공 — 프런트가 렌더링
app.get('/api/profile', (_req, res) => {
  if (!PROFILE_MD) {
    return res
      .status(404)
      .json({ success: false, message: 'about-me2.md 데이터를 찾을 수 없습니다.' });
  }
  res.json({ success: true, data: { markdown: PROFILE_MD } });
});

// 근거 기반 Q&A
app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body || {};

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: '질문을 입력해 주세요.' });
    }

    const result = await askAboutMe(question.trim());
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ask] error:', err);
    return res.status(500).json({
      success: false,
      message: '답변을 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// ─────────────────────────────────────────────
// SPA fallback (Express 5 wildcard 문법)
// ─────────────────────────────────────────────
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────
// 로컬 실행 / 서버리스 export 듀얼 모드
// ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`🎨 about-me app running on http://localhost:${PORT}`)
  );
}

module.exports = app;
