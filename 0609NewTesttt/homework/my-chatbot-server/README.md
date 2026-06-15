# 나만의 대화형 챗봇 (ASCII Terminal)

답변하는 AI의 **프로필(성격·말투·전문분야)** 을 직접 설정하면, AI가 그 설정대로 캐릭터를 유지하며 대화하는 챗봇입니다. 대화 기록은 화면에 차곡차곡 쌓이고 새로고침해도 유지됩니다.

Aceternity의 ASCII Art 데모에서 영감을 받은 **다크 터미널 / ASCII 아트** 감성으로 디자인했습니다 (헤더의 ASCII 배너는 실시간 생성되는 플라스마 애니메이션).

> 디자인 참고: `npx shadcn@latest add @aceternity/ascii-art-demo` — 해당 컴포넌트는 React+빌드 환경 전용이라 그대로 설치하지 않고, CDN React + Tailwind 만으로 같은 분위기를 직접 구현했습니다.

## 핵심 기능
1. **프로필 설정** — 이름 / 성격 / 말투 / 전문분야를 입력 (4종 빠른 프리셋 제공). 즉시 저장됨.
2. **프로필대로 답변** — 설정값이 시스템 프롬프트로 변환되어, AI가 그 캐릭터로 일관되게 응답.
3. **대화 기록 누적** — 메시지가 화면에 쌓이고 `localStorage`에 저장 (스트리밍 실시간 출력 + 자동 스크롤).

## 구조
```
my-chatbot-server/
├─ server.js          # Node 프록시 (API 키를 서버에만 보관, Anthropic SSE 스트림 중계)
├─ public/index.html  # 프론트엔드 (CDN React + Tailwind + Babel, 단일 파일)
├─ package.json
├─ .env / .env.example
└─ .gitignore
```
브라우저는 이 서버의 `/api/chat` 만 호출하므로 **API 키가 절대 클라이언트로 노출되지 않습니다.**

## 실행 방법
1. **API 키 입력** — `.env` 파일을 열어 실제 키를 넣으세요:
   ```
   ANTHROPIC_API_KEY=sk-ant-...   # console.anthropic.com 에서 발급
   PORT=3001
   MODEL=claude-opus-4-8
   ```
2. **서버 실행** (Node 18+ 필요):
   ```bash
   npm start
   ```
3. 브라우저에서 **http://localhost:3001** 접속 → 왼쪽에서 프로필 설정 후 대화 시작.

> 같은 저장소의 `my-ai-tutor-server`(포트 3000)와 충돌하지 않도록 이 앱은 **포트 3001** 을 사용합니다.

## 동작 원리
- 프론트엔드는 매 요청마다 현재 프로필을 `/api/chat` 으로 함께 전송합니다.
- 서버(`server.js`)가 프로필을 시스템 프롬프트로 만들어 Claude에 전달하고, 응답 스트림을 그대로 브라우저로 중계합니다.
- API는 상태가 없으므로(stateless), 대화 중간에 프로필을 바꾸면 **그다음 메시지부터** 즉시 반영됩니다.
