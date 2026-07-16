# DAILY BREW v1 — 발표 자산 (7주차 퀘스트 7: [Final] 개인 프로젝트 v1)

노션 원본: https://ruucm.notion.site/Final-v1-1-44a7eb4baa8c8264b0c5813540cb8e28

**앱 코드·README·회고는 [`../../Week6/boss-dashboard/`](../../Week6/boss-dashboard/)** — 이 폴더는 제출/발표용 자산만 모았다.

- **배포 URL**: https://boss-dashboard-virid.vercel.app
- **v1 핵심 기능**: 매출 수기 입력 (입력·조회·삭제 + 대시보드 즉시 반영) — 기획서 DEV.md Phase 2.5 "실사용의 관문"

## 파일

| 파일 | 내용 |
|---|---|
| `thumbnail-1920x1080.png` | 발표용 썸네일 (첫 슬라이드 겸용) — `thumbnail.html` 렌더 |
| `thumbnail.html` | 썸네일 원본 (1920×1080 정적 HTML, Sonnet 서브 에이전트 제작) |
| `daily-brew-v1-demo.mp4` | **데모 영상 28초** — 로그인 → 매출 입력 2건 → 대시보드 반영 → 차트/리뷰 |
| `daily-brew-v1-demo.gif` | 데모 GIF 원본 (크롬 녹화) |
| `03-v1-sales-entry-prod.jpg` | 배포판 매출 입력 화면 (입력 2건 + 즉시 반영) |
| `agent-chat-v1.png` | 에이전트 대화 스크린샷 |

## 썸네일 재렌더

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --hide-scrollbars \
  --screenshot=thumbnail-1920x1080.png --window-size=1920,1080 thumbnail.html
```
