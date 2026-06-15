# 0602NewTest01 — AI 공장장 부트캠프 실습 모음

디자이너에서 개발자로 나아가는 여정에서 진행한 **부트캠프 실습 프로젝트 모음**입니다.
HTML/CSS/JavaScript 기초부터 외부 API 연동, Node.js 서버, AI 활용 웹앱까지의 학습 과정을 담고 있습니다.

## 📁 폴더 구조

### `0604/` — 웹 기초 & 미니 앱
HTML/CSS/JavaScript 기본기를 다지며 만든 작은 도구들입니다.

| 폴더 | 내용 |
|------|------|
| `01` ~ `03` | HTML/CSS/JS 기초 실습 |
| `05-bmi` | BMI 계산기 |
| `06-usd` | 환율(USD) 변환기 |
| `07-Color` | 컬러 도구 |
| `08-age` | 나이 계산기 |
| `09-dday` | D-day 계산기 |
| `10-dpay` | 더치페이 계산기 |
| `11-duryTax` | 세금 계산기 |
| `13-Qrmake` | QR 코드 생성기 |
| `14-PDFmake` | PDF 생성기 |
| `15-memeMake` | 밈/이미지 생성기 |
| `screenshots` | 각 실습 결과 스크린샷 모음 |

### `0609NewTesttt/` — API 연동 & AI 웹앱
외부 API와 AI(LLM)를 활용한 본격적인 웹 애플리케이션 실습입니다.

| 폴더 | 내용 |
|------|------|
| `Goblin/NASA_app`, `Goblin/weather-app` | NASA·날씨 API 연동 앱 |
| `Poketm-on` | 포켓몬 API 활용 앱 |
| `homework/ai-nickname-generator` | AI 별명 생성기 (서버 + AI) |
| `homework/ai-image-studio2` | AI 이미지 스튜디오 |
| `homework/ai-wiki-matrix` | AI 위키 매트릭스 |
| `homework/dream-interpreter` | AI 꿈 해몽 앱 |
| `homework/coin-ticker` | 코인 시세 티커 |
| `homework/weather-outfit` | 날씨 기반 옷차림 추천 |
| `homework/my-chatbot-server` | 챗봇 서버 |
| `homework/my_mental_assistant` | 멘탈 어시스턴트 |
| `my-ai-tutor-server`, `my-ai-tutor` | 1:1 AI 튜터 앱 |
| `my-api-2`, `myServer` | API/서버 연동 실습 |

### 문서
- `about-me.md`, `about-me2.md` — 자기소개
- `single-server-specialist.md` — 서버 관련 정리 노트

## 🛠️ 사용 기술
- **프론트엔드**: HTML, CSS, JavaScript (일부 CDN 기반 React + Tailwind)
- **백엔드**: Node.js (Express 등 경량 프록시 서버)
- **외부 연동**: 각종 공개 API, AI/LLM API
- **배포**: Vercel (`vercel.json` 포함 프로젝트)

## ▶️ 실행 방법
프로젝트 유형에 따라 다릅니다.

- **정적 HTML 앱** (대부분의 `0604/*`): `index.html`을 브라우저로 직접 열기
- **서버 포함 앱** (`server.js`, `package.json`이 있는 폴더):
  ```bash
  npm install
  npm start
  ```
  AI/외부 API를 쓰는 앱은 해당 폴더의 `.env.example`을 참고해 `.env` 파일에 API 키를 설정하세요.

> ⚠️ API 키 등 비밀 정보는 `.gitignore`로 제외되어 저장소에 포함되지 않습니다.

## 📌 메모
이 저장소는 학습 과정을 기록하는 공간으로, 각 폴더는 독립적인 실습 단위입니다.
