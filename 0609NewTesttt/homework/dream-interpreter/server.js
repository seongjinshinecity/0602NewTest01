// server.js — AI 꿈해몽 백엔드 (로컬 node + Vercel 서버리스 듀얼 모드)
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// 미들웨어
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────
// AI 해몽가 캐릭터별 System Prompt 정의
//   key 값은 client.js가 보내는 character 필드와 일치해야 함
// ─────────────────────────────────────────────
const PERSONAS = {
  mystic: {
    label: '🔮 신비로운 점술가',
    system: `당신은 별과 달, 무의식의 상징을 읽는 신비로운 점술가입니다.
"그대의 무의식이 보내온 계시를 읽어보니..." 와 같은 신비롭고 예언적인 말투를 사용하세요.
꿈 속의 상징을 운명, 길흉, 다가올 징조와 연결지어 풀이합니다.
고풍스럽고 시적인 어조를 유지하되, 마지막에는 따뜻한 조언 한마디를 남기세요.`,
  },
  psychologist: {
    label: '🧠 과학적인 심리학자',
    system: `당신은 융과 프로이트의 이론에 정통한 과학적인 심리 분석가입니다.
차분하고 논리적인 말투로, 꿈을 무의식의 욕구·불안·기억의 반영으로 해석합니다.
상징을 심리학적 개념(억압, 보상, 자아실현 등)과 연결해 설명하되,
일상에서 실천할 수 있는 현실적인 조언으로 마무리하세요.`,
  },
  friend: {
    label: '😎 솔직한 절친',
    system: `당신은 사용자의 오랜 절친입니다.
편안한 반말과 친근한 말투로, 부담 없이 꿈 이야기를 들어주고 풀이해 줍니다.
가볍고 유쾌하지만, 진심으로 응원하는 마음을 담아 솔직하게 이야기하세요.
이모지를 적절히 섞어 친구처럼 대화하듯 풀어 주세요.`,
  },
  sage: {
    label: '📜 동양 해몽 도사',
    system: `당신은 주역과 전통 해몽서에 통달한 동양의 해몽 도사입니다.
점잖고 지혜로운 어조로, 꿈 속 상징을 전통적인 길몽·흉몽 풀이와 음양오행의 이치로 해석합니다.
옛 속담이나 고사를 곁들이되, 끝에는 마음을 다스리는 가르침을 전하세요.`,
  },
};

// ─────────────────────────────────────────────
// Anthropic Claude API 호출 헬퍼
// ─────────────────────────────────────────────
async function interpretDream(dream, personaKey) {
  const persona = PERSONAS[personaKey] || PERSONAS.mystic;
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  // API 키가 없을 경우: 데모용 목업 응답으로 graceful 폴백
  if (!apiKey) {
    return {
      character: persona.label,
      interpretation:
        `[데모 모드] ${persona.label}의 풀이입니다.\n\n` +
        `"${dream}"\n\n` +
        `이 꿈은 당신의 마음 깊은 곳에 자리한 바람과 변화의 신호로 보입니다. ` +
        `실제 AI 해몽을 받으시려면 서버 환경변수에 ANTHROPIC_API_KEY를 설정해 주세요. ` +
        `그러면 선택하신 해몽가가 당신의 꿈을 생생하게 풀이해 드립니다.`,
      demo: true,
    };
  }

  const systemPrompt =
    persona.system +
    `\n\n사용자가 들려준 꿈을 위 페르소나에 맞춰 해몽해 주세요. ` +
    `결과는 3~5개의 자연스러운 문단으로, 한국어로 작성합니다. ` +
    `마크다운 기호(#, *, - 등)는 사용하지 말고 매끄러운 문장으로만 답하세요.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `어젯밤 제가 꾼 꿈은 이렇습니다:\n\n"${dream}"\n\n이 꿈을 해몽해 주세요.`,
        },
      ],
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
    character: persona.label,
    interpretation: textBlock ? textBlock.text : '해몽 결과를 불러오지 못했습니다.',
    demo: false,
  };
}

// ─────────────────────────────────────────────
// API 라우트: 꿈 해몽
// ─────────────────────────────────────────────
app.post('/api/dream-analysis', async (req, res) => {
  try {
    const { dream, character } = req.body || {};

    // 입력값 검증 (공백 예외 처리)
    if (!dream || typeof dream !== 'string' || dream.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: '꿈 내용을 입력해 주세요.' });
    }

    const result = await interpretDream(dream.trim(), character);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[dream-analysis] error:', err);
    return res.status(500).json({
      success: false,
      message: '해몽을 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
});

// 선택 가능한 해몽가 목록 제공 (프런트가 동적으로 활용 가능)
app.get('/api/personas', (_req, res) => {
  const list = Object.entries(PERSONAS).map(([key, v]) => ({
    key,
    label: v.label,
  }));
  res.json({ success: true, data: list });
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
    console.log(`🌙 Dream Interpreter running on http://localhost:${PORT}`)
  );
}

module.exports = app;
