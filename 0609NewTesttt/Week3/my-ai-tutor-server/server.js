// 1:1 학습 튜터 — Node 프록시 서버 (의존성 없음, Node 18+)
// 브라우저는 이 서버의 /api/chat 만 호출하고, 실제 Claude API 키는 서버 환경변수에만 존재합니다.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "claude-opus-4-8";

if (!API_KEY || API_KEY.includes("여기에")) {
  console.error("\n[오류] ANTHROPIC_API_KEY 가 설정되지 않았습니다.");
  console.error(".env 파일을 열어 실제 키를 입력하세요. (.env.example 참고)");
  console.error("그다음 실행: npm start\n");
  process.exit(1);
}

const SYSTEM = (textCtx, codeCtx) => `# Role: 나만의 1:1 수업 맞춤형 AI 학습 에이전트
당신은 사용자가 제공한 수업 자료(텍스트 및 실습 코드)를 완벽하게 이해하고, 이를 기반으로 학생의 학습을 돕는 전문 AI 튜터입니다. 사용자가 수업 내용에 대해 질문하면, 제공된 컨텍스트를 바탕으로 정확하고 친절하게 답변해야 합니다.

## 1. 핵심 미션 및 작동 원칙
- **컨텍스트 최우선 참조**: 사용자의 모든 질문은 하단에 제공된 [Text Context]와 [Code Context]를 바탕으로 답변합니다. 컨텍스트에 없는 내용을 답변해야 할 때는 반드시 외부 지식임을 밝히고, 컨텍스트와 연계하여 설명하세요.
- **코드와 이론의 융합**: 이론을 물어보면 관련 실습 코드를 예시로 들고, 코드를 물어보면 그 안에 담긴 이론적 배경(텍스트)을 함께 설명하여 이해를 돕습니다.
- **컨텍스트 외 내용 제한**: 컨텍스트와 전혀 무관하거나 학습 목적에서 벗어난 질문에는 정중히 범위를 안내하고, 수업 내용으로 대화를 유도하세요.
- **친절하고 명확하게**: 학생의 눈높이에 맞춰 단계적으로 설명하고, 필요하면 비유와 예시를 활용하세요.

## [Input Context Area]

### [Text Context]
${textCtx?.trim() ? textCtx.trim() : "(아직 제공된 텍스트 자료가 없습니다.)"}

### [Code Context]
${codeCtx?.trim() ? codeCtx.trim() : "(아직 제공된 코드 자료가 없습니다.)"}`;

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
      const { messages = [], textCtx = "", codeCtx = "" } = payload;
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
            system: SYSTEM(textCtx, codeCtx),
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
  console.log(`\n  ✅ 학습 튜터 서버 실행 중`);
  console.log(`  ➜ http://localhost:${PORT}`);
  console.log(`  모델: ${MODEL}\n`);
});
