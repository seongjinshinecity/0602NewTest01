# 📋 개인 프로젝트 — 카페 사장님 대시보드 (기획 + 리서치)

두 퀘스트의 산출물 폴더: **[Planning] 기획서 3종** + **[Research] 경쟁 서비스 3곳 리서치**.
프로토타입 구현체는 `../boss-dashboard` (6주차 보스 퀘스트 = 이 프로젝트의 Phase 1~2).

## [Planning] 기획서 3종

| 파일 | 내용 |
|---|---|
| `MISSION.md` | 왜 만드는가 — 문제(마감 후 조각난 데이터)→타겟(1인 카페 사장님 한 명)→해결(아침 30초 브리핑) + Tagline *"A morning briefing for solo café owners."* + 성공 지표·Anti-Scope |
| `DEV.md` | 어떻게 — 구조 선택(Supabase 기반, 3옵션 비교) + Phase 1~4 TODO(난이도·체크포인트, 완료 항목 반영) + 외부 설정 표 |
| `AUDIENCES.md` | 어떻게 유저를 모을 것인가 — 페르소나 재확인(경쟁사 유저 불만 기반) + 채널 5곳 + 첫 10명 확보 전략 + 하지 않을 것 |
| `screenshots/01-mission.png`, `02-dev.png` | 제출용 스크린샷 |

## [Research] 경쟁 서비스 3곳

| 파일 | 내용 |
|---|---|
| `research.md` | 캐시노트(국내)·Square Analytics(해외)·네이버 스마트플레이스(인접) 비교표 + 각 사 약점 + **차별화 3**(브리핑 우선·한 사람용·내 카페 맥락) + AUDIENCES.md 인풋 |
| `research-screenshots/01~03-*.png` | 브라우저 자동 탐색 캡처 3장 (각 서비스 1장) |

- 탐색 방식: 크롬(claude-in-chrome)으로 랜딩·기능·가격 페이지 실탐색 + headless 캡처. 네이버는 확장 차단으로 headless 캡처로 수집.
- "AI와의 리서치 대화"는 이 Claude Code 세션 자체 — 제출 시 세션 화면 캡처 1장 첨부.

## 연결 고리

`research.md` 차별화 → `MISSION.md` 성공 지표 → `DEV.md` Phase 3(LLM 브리핑) → `../boss-dashboard`(구현).
`research.md`의 경쟁사 유저 불만 → `AUDIENCES.md` 페르소나·채널·첫 10명 확보 전략.
