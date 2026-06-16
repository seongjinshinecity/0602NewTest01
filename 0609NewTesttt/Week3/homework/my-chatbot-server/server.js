// 나만의 대화형 챗봇 — Node 프록시 서버 (의존성 없음, Node 18+)
// 브라우저는 이 서버의 /api/chat 만 호출하고, 실제 Claude API 키는 서버 환경변수에만 존재합니다.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "claude-opus-4-8";

if (!API_KEY || API_KEY.includes("여기에")) {
  console.error("\n[오류] ANTHROPIC_API_KEY 가 설정되지 않았습니다.");
  console.error(".env 파일을 열어 실제 키를 입력하세요. (.env.example 참고)");
  console.error("그다음 실행: npm start\n");
  process.exit(1);
}

// 사용자가 설정한 프로필(성격·말투·전문분야)을 시스템 프롬프트로 변환
const SYSTEM = (p = {}) => {
  const name = (p.name || "").trim() || "AI 어시스턴트";
  const persona = (p.persona || "").trim() || "친절하고 차분하며, 호기심이 많은 성격";
  const tone = (p.tone || "").trim() || "정중하면서도 다정한 존댓말";
  const expertise = (p.expertise || "").trim() || "일반 상식과 일상 대화";
  return `당신은 사용자가 직접 설정한 프로필을 완벽하게 체화한 대화형 AI 캐릭터입니다.
아래 프로필이 곧 당신의 정체성입니다. 모든 답변에서 이 성격·말투·전문성을 일관되게 유지하세요.

## 나의 프로필
- 이름: ${name}
- 성격: ${persona}
- 말투: ${tone}
- 전문분야: ${expertise}

## 행동 원칙
1. **캐릭터 유지**: 위 성격과 말투를 절대 깨지 마세요. 어떤 상황에서도 "${name}"로서 일관되게 응답합니다.
2. **말투 반영**: 모든 문장을 설정된 말투(${tone})로 표현하세요. 단순 정보 전달이 아니라 캐릭터의 목소리가 느껴지게 합니다.
3. **전문성 발휘**: ${expertise} 분야의 질문에는 깊이 있고 정확하게 답하고, 필요하면 예시·비유를 활용하세요. 그 외 주제도 설정된 성격으로 자연스럽게 응대합니다.
4. **자기소개 금지(반복)**: 매번 프로필을 나열하지 말고, 자연스러운 대화로 녹여내세요.
5. **간결함과 풍부함의 균형**: 핵심을 먼저 전하되, 캐릭터의 개성이 드러나도록 답하세요. 마크다운(굵게, 목록, 코드블록)을 적절히 사용해도 좋습니다.`;
};

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

const server = http.createServer(async (req, res) => {
  // --- API 프록시 ---
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "잘못된 요청 형식입니다." } }));
      }
      const { messages = [], profile = {} } = payload;
      try {
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 4000,
            system: SYSTEM(profile),
            stream: true,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!upstream.ok) {
          const errText = await upstream.text();
          res.writeHead(upstream.status, { "content-type": "application/json" });
          return res.end(errText);
        }

        // SSE 스트림을 그대로 브라우저로 전달
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        for await (const chunk of upstream.body) res.write(chunk);
        res.end();
      } catch (e) {
        if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "서버 오류: " + (e.message || e) } }));
      }
    });
    return;
  }

  // --- 정적 파일 서빙 ---
  let urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(__dirname, "public", path.normalize(urlPath));
  if (!filePath.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not Found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ✅ 나만의 대화형 챗봇 서버 실행 중`);
  console.log(`  ➜ http://localhost:${PORT}`);
  console.log(`  모델: ${MODEL}\n`);
});
