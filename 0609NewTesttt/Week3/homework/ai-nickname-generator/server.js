// AI 별명 생성기 — OpenAI 프록시 서버
// 프론트엔드(index.html / client.js)는 API 키를 절대 보지 않습니다.
// 키는 이 서버에서만 사용됩니다.

const express = require('express');
const path = require('path');
const fs = require('fs');

// 로컬 개발용 .env 로더 — 의존성 없이 동작.
// (Vercel 등 배포 환경에서는 .env가 없고 대시보드 환경변수를 사용하므로 조용히 건너뜀)
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch (_) { /* .env 없으면 무시 */ }
})();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---- 설정 --------------------------------------------------------------
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
// 기본은 OpenAI. 다른 OpenAI 호환 엔드포인트(로컬 LLM, Azure 등)를 쓰려면 AI_BASE_URL 지정.
const OPENAI_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions').trim();
// Pollinations 인증 키(sk_...) — 있으면 Bearer로 보내 레이트리밋을 우회.
const POLLINATIONS_API_KEY = (process.env.POLLINATIONS_API_KEY || '').trim();

// 별명 생성 페르소나 — 이름/생일/꿈 세 가지를 모두 녹여 재미있게 짓도록 지시
const SYSTEM_PROMPT = `당신은 "별명 장인"입니다. 사용자의 이름, 생일, 그리고 꿈(장래희망/목표)을 받아
재치 있고 기억에 남는 한국어 별명 3개를 지어줍니다.

규칙:
- 반드시 한국어로 응답합니다.
- 세 가지 입력(이름, 생일, 꿈)을 모두 창의적으로 녹여냅니다. 어느 하나라도 무시하면 안 됩니다.
  · 이름: 발음/글자/말장난을 활용
  · 생일: 계절, 별자리, 띠, 탄생석, 숫자 등에서 영감을 얻음
  · 꿈: 그 사람이 되고 싶어 하는 모습을 멋지거나 귀엽게 표현
- 별명은 3~10자 내외로 짧고 입에 착 붙게, 서로 겹치지 않는 색깔로 만듭니다.
- 너무 평범하거나 누구에게나 쓸 수 있는 별명은 금지합니다. 이 사람만을 위한 별명이어야 합니다.
- 가볍고 긍정적이며 재미있는 톤. 비하/혐오 표현은 절대 금지합니다.

반드시 아래 형태의 JSON 객체만 출력합니다(다른 텍스트 없이):
{
  "nicknames": [
    { "nickname": "별명", "reason": "왜 이런 별명인지 한 문장으로 재치 있게 설명", "emoji": "어울리는 이모지 1개" },
    { "nickname": "...", "reason": "...", "emoji": "..." },
    { "nickname": "...", "reason": "...", "emoji": "..." }
  ]
}`;

// ---- AI 백엔드 (하이브리드) --------------------------------------------
// 1) OPENAI_API_KEY가 있으면 OpenAI를 먼저 시도
// 2) 키가 없거나 OpenAI가 실패하면 무료 Pollinations로 폴백
// 둘 다 OpenAI 호환 채팅 형식이라 messages를 그대로 재사용한다.
async function generate(messages) {
  if (OPENAI_API_KEY) {
    const out = await callOpenAICompatible(
      OPENAI_URL,
      { Authorization: `Bearer ${OPENAI_API_KEY}` },
      MODEL,
      messages
    );
    if (out) return out;
    console.warn('OpenAI 실패 → Pollinations로 폴백합니다.');
  }
  // Pollinations 폴백.
  // 인증 키(sk_)가 있으면 신규 게이트웨이(gen.pollinations.ai)로 → 레이트리밋 우회.
  // 키가 없으면 레거시 익명 엔드포인트(text.pollinations.ai)로.
  if (POLLINATIONS_API_KEY) {
    return callOpenAICompatible(
      'https://gen.pollinations.ai/v1/chat/completions',
      { Authorization: `Bearer ${POLLINATIONS_API_KEY}` },
      'openai',
      messages
    );
  }
  return callOpenAICompatible('https://text.pollinations.ai/openai', {}, 'openai', messages);
}

async function callOpenAICompatible(url, extraHeaders, model, messages) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        messages,
        // JSON 모드: messages 안에 "JSON"이 포함되어 있어야 함(시스템 프롬프트에 있음)
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 600,
      }),
    });
    clearTimeout(timer);
    if (!r.ok) {
      console.error(`AI 백엔드 오류 (${url}):`, r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch (err) {
    console.error(`AI 백엔드 예외 (${url}):`, err.message);
    return null;
  }
}

// 모델이 코드펜스(```json ... ```)나 잡텍스트로 감싸 보내도 JSON 본문만 추출.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

// ---- API ---------------------------------------------------------------
// POST /api/nicknames  { name, birthday, dream }
app.post('/api/nicknames', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 40);
    const birthday = String(req.body?.birthday || '').trim().slice(0, 40);
    const dream = String(req.body?.dream || '').trim().slice(0, 100);

    if (!name || !birthday || !dream) {
      return res.status(400).json({
        success: false,
        message: '이름, 생일, 꿈을 모두 입력해 주세요.',
      });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `다음 사람을 위한 재미있는 별명 3개를 JSON으로 지어주세요.\n` +
          `- 이름: ${name}\n` +
          `- 생일: ${birthday}\n` +
          `- 꿈: ${dream}`,
      },
    ];

    // OpenAI(키 있을 때) → 실패/무키 시 Pollinations(무료)로 폴백하는 하이브리드 백엔드.
    const raw = await generate(messages);
    if (!raw) {
      return res.status(502).json({
        success: false,
        message: '별명을 짓는 데 실패했어요. 잠시 후 다시 시도해 주세요.',
      });
    }

    // 방어적 파싱 — AI가 깨진 JSON을 줘도 사용자에게 500을 던지지 않는다.
    let parsed;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (e) {
      console.error('JSON parse failed:', raw);
      return res.status(502).json({
        success: false,
        message: 'AI 응답 형식이 올바르지 않아요. 다시 시도해 주세요.',
      });
    }

    let nicknames = Array.isArray(parsed?.nicknames) ? parsed.nicknames : [];
    nicknames = nicknames
      .filter((n) => n && typeof n.nickname === 'string' && n.nickname.trim())
      .slice(0, 3)
      .map((n) => ({
        nickname: String(n.nickname).trim(),
        reason: String(n.reason || '').trim(),
        emoji: String(n.emoji || '✨').trim().slice(0, 4) || '✨',
      }));

    if (nicknames.length < 3) {
      return res.status(502).json({
        success: false,
        message: '별명을 충분히 만들지 못했어요. 다시 시도해 주세요.',
      });
    }

    res.json({ success: true, data: { nicknames } });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      message: '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// SPA fallback (Express 5 문법)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Local: start server / Vercel: export app
if (require.main === module) {
  app.listen(PORT, () => console.log(`AI 별명 생성기 실행 중 → http://localhost:${PORT}`));
}
module.exports = app;
