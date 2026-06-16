# AI 별명 생성기 — NICKNAME MACHINE 🪄

이름 · 생일 · 꿈을 입력하면 **AI가 당신만을 위한 재미있는 별명 3개**를 지어주는 3파일 서버 앱입니다.
마음에 드는 별명은 카드를 눌러 **선택**하거나 **복사**할 수 있어요.

> 디자인은 *Generative Design* 책 표지에서 영감을 받았습니다 — 흰 캔버스 · 두꺼운 타이포 · 흐르는 멀티컬러 리본 배경 + 인터랙티브 카드/버튼.

## 구성 (3-file)

| 파일 | 역할 |
|------|------|
| `server.js` | Express 서버 + AI 프록시. `POST /api/nicknames` 로 이름/생일/꿈을 받아 별명 3개를 JSON으로 반환. **API 키는 서버에만** 존재합니다. |
| `index.html` | UI. 흐르는 리본 캔버스 배경, 입력 카드, 결과 카드. |
| `client.js` | 리본 애니메이션, API 호출, 카드 렌더링 · 선택 · 복사 인터랙션. |

부속 파일: `package.json`, `vercel.json`, `.env`, `.env.example`, `.gitignore`.

## AI 백엔드 (하이브리드 폴백)

서버는 두 단계로 별명을 생성합니다 (둘 다 OpenAI 호환 채팅 형식):

1. **OpenAI** — `OPENAI_API_KEY` 가 설정돼 있으면 먼저 사용 (`gpt-4o-mini`).
2. **Pollinations** — 키가 없거나 OpenAI 호출이 실패하면 폴백으로 전환.
   - `POLLINATIONS_API_KEY`(sk_…)가 있으면 신규 게이트웨이 `https://gen.pollinations.ai/v1/chat/completions` 로 Bearer 인증 → **레이트리밋 없이** 동작. **현재 이 앱은 이 키로 동작 중입니다.**
   - 키가 없으면 레거시 익명 엔드포인트(`text.pollinations.ai`)로 — 단, 공용/데이터센터 IP는 속도 제한될 수 있음.

덕분에 키 없이도 동작하고, OpenAI 키를 넣으면 자동으로 OpenAI를 우선 사용합니다.

- `.env` 의 `POLLINATIONS_API_KEY=` 에 **sk_ 키**를 넣으면 안정적으로 동작합니다. (발급: [enter.pollinations.ai](https://enter.pollinations.ai))
- OpenAI 품질을 원하면 `OPENAI_API_KEY=` 에 **본인의 유효한 OpenAI 키**를 넣으세요.
- 다른 OpenAI 호환 엔드포인트(로컬 LLM, Azure 등)를 쓰려면 `AI_BASE_URL` 환경변수를 지정하세요.

## 로컬 실행

```bash
npm install
npm start              # → http://localhost:3000
```

`.env` 예시는 `.env.example` 참고. 키 없이 바로 실행하면 Pollinations 폴백으로 동작합니다.
(단, 데이터센터/공용 IP에서는 Pollinations가 속도 제한될 수 있으니, 안정성을 위해 OpenAI 키 사용 권장.)

## 배포 (Vercel)

`vercel.json` 이 포함돼 있습니다. Vercel 대시보드의 **Environment Variables** 에
`OPENAI_API_KEY` (그리고 선택적으로 `OPENAI_MODEL`) 를 추가하세요 — 키를 저장소에 커밋하지 마세요.

## API

```http
POST /api/nicknames
Content-Type: application/json

{ "name": "김하늘", "birthday": "3월 14일", "dream": "우주 비행사" }
```

응답:

```json
{
  "success": true,
  "data": {
    "nicknames": [
      { "nickname": "하늘우주왕", "reason": "이름과 꿈을 합친 별명", "emoji": "🚀" },
      { "nickname": "파이데이별", "reason": "3월 14일 파이데이 생일", "emoji": "🥧" },
      { "nickname": "은하수하늘", "reason": "밤하늘을 동경하는 미래의 비행사", "emoji": "🌌" }
    ]
  }
}
```
