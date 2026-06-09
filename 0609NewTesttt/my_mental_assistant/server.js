// 마음 상담사 — OpenAI 프록시 서버
// 프론트엔드(index.html)는 API 키를 절대 보지 않습니다. 키는 이 서버에서만 사용됩니다.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---- 설정 --------------------------------------------------------------
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

// 상담사 페르소나 + 안전 가이드라인
const SYSTEM_PROMPT = `당신은 "마음 상담사"라는 이름의 따뜻하고 공감적인 한국어 심리 상담사입니다.

대화 원칙:
- 항상 한국어로, 부드럽고 진심 어린 존댓말로 응답합니다.
- 먼저 사용자의 감정을 충분히 인정하고 공감합니다(validation). 섣부른 조언이나 해결책 제시는 자제합니다.
- 판단하지 않고, 사용자가 스스로의 마음을 탐색할 수 있도록 열린 질문을 하나 정도 덧붙입니다.
- 응답은 2~4문장 정도로 간결하고 따뜻하게 유지합니다. 너무 길지 않게 합니다.
- 의학적 진단이나 처방을 하지 않습니다. 당신은 전문 치료를 대신하지 않습니다.

안전(매우 중요):
- 자해, 자살, 타인을 해치려는 의도, 학대 등 위기 신호가 보이면, 먼저 따뜻하게 마음을 살피되 반드시 전문가의 도움과 긴급 연락처를 안내합니다: 자살예방상담전화 ☎ 109(24시간), 정신건강 위기상담 1577-0199.
- 위급해 보이면 가까운 사람이나 119에 도움을 청하도록 부드럽게 권합니다.`;

// ---- API ---------------------------------------------------------------
// POST /api/chat  { history: [{ role: 'user'|'assistant', content: string }, ...] }
app.post('/api/chat', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해 주세요.',
      });
    }

    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    // 들어온 대화 이력을 OpenAI 형식으로 정리(최근 20개로 제한)
    const safeHistory = history
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim()
      )
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }));

    if (safeHistory.length === 0) {
      return res.status(400).json({ success: false, message: '메시지가 비어 있습니다.' });
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...safeHistory];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errText);
      return res.status(502).json({
        success: false,
        message: 'AI 응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    }

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ success: false, message: '빈 응답을 받았어요. 다시 시도해 주세요.' });
    }

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Local: start server / Vercel: export app
if (require.main === module) {
  app.listen(PORT, () => console.log(`마음 상담사 서버 실행 중 → http://localhost:${PORT}`));
}
module.exports = app;
