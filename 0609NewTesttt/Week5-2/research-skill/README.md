# 🔎 자동 리서치 스킬 (research-skill) — 배치3 [My Agent]

웹 리서치를 **매번 같은 절차·같은 포맷**으로 수행하는 스킬. 핵심 가치는 일관성 — 주제가 바뀌어도 결과물 구조가 동일해 바로 보고서로 쓸 수 있다.

## 구성
- `.claude/skills/research/SKILL.md` — 스킬 정의(언제 발동 + 절차 + 고정 포맷).
- `out/카페-마이크로-인플루언서-마케팅-2026.md` — **이번 세션에 실제 실행해 만든 리서치 결과**.
- `docs/screenshots/` — **크롬(브라우저 MCP)으로 출처 3곳을 실제 탐색한 화면 3장**.

## 절차 (SKILL.md)
1. 주제 확정(키워드 1개) → 2. `WebSearch`로 검색 + `WebFetch`로 본문 정독(**출처 3곳 이상**) → 3. 고정 포맷 md 작성 → 4. Notion 연결 시 공유(없으면 `out/`에 저장).

## 고정 포맷
`# 리서치: 주제` / 메타(수집일·키워드·출처수) / **출처별 핵심** / **한 줄 요약** / **다음 액션** — 섹션 순서·제목 불변.

## 어떻게 검증했나 (이번 세션)
- 키워드 `cafe micro influencer marketing trend 2026 small business`로 **실제 `WebSearch` 실행** → **`WebFetch`로 본문 정독** → **크롬(브라우저 MCP)으로 출처 3곳을 직접 열어 탐색·캡처**(`docs/screenshots/` 3장).
  1. InfluenceFlow — Micro-Influencer 2026 Guide
  2. impact.com — Partner with smaller creators in 2026
  3. Sprout Social — Influencer marketing trends 2026 ("마이크로 1만~10만이 최고 인게이지먼트·최저 획득비용 주도")
- 결과물(`out/...2026.md`)의 모든 수치(ROI 1달러당 $5.2, 마이크로 ER 3~10%, 시장 $33B 등)는 검색·열람으로 확인한 실제 사실이며, 그 결론이 배치3-3(인스타 인플루언서)·3-2(경쟁분석)로 자연스럽게 연결된다.
- 달성 수준: **기본(웹 3곳+ 탐색 & md 생성) + 자동 탐색 스크린샷 3장 실제 수행 완료.** 이 SKILL.md는 디렉토리 스코프 스킬로 로드 가능하며, 다른 주제로 호출하면 동일 절차·포맷이 재현된다.

> ⚠️ Foodhub(`foodhubforbusiness.com`)는 한국 IP 지역차단(Cloudflare 1009)이라 열람 못 해 **Sprout Social로 대체**했다(지어내지 않음 — 못 본 출처는 쓰지 않는다는 스킬 규칙 준수).

## 출처
SKILL.md는 Week5-1 참고본에서 이식, **리서치 결과(out/...md)는 이번 세션에 실제 WebSearch/WebFetch로 새로 생성**했다.
