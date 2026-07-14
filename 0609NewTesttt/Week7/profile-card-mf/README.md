# [Design] 내 프로필 카드 만들기 (고블린, 7주차 추정)

노션 원본: https://ruucm.notion.site/Design-f067eb4baa8c8337ac9681bdc0d0f919

## 미션 요약
나의 이름·하는 일·좋아하는 것·연락처를 한 장에 담은 개인 프로필 카드. 기본 15pt(1080×1350, 컬러+폰트 일관성) + 앞면(소개)·뒷면(포트폴리오·SNS 상세) 양면 버전 보너스 5pt.

## 선택한 프로필: "mf"
`../../about-me2.md`에 있는 기존 가상 캐릭터 "mf(엠에프) — 테크니컬 공간 디자이너 및 브랜딩 디렉터"를 그대로 사용. 실존 인물이 아닌, 이전 실습에서 만든 캐릭터 페르소나.

카드에 반영한 항목:
- **이름 / 하는 일**: mf · Technical Space Designer & Branding Director
- **한 줄 소개**: about-me2.md의 아이덴티티 크레도 그대로 인용
- **좋아하는 것**: about-me2.md "5. 좋아하는 것" 섹션에서 5개 압축(깊은 대화·가족과의 식사·낯선 도시 여행·영감 아카이브·꿈 일기)
- **연락처**: 실존하지 않는 가상 이메일/SNS 핸들(hello@mf-studio.kr, @mf.studio) — 캐릭터용 플레이스홀더

## 디자인 톤
about-me2.md "4. 취향과 선호" 표를 그대로 스타일 가이드로 사용:
- 컬러: 저채도 뉴트럴톤 (Warm Gray #7C7367 · Charcoal #2B2A28 · Sand Beige #EFE9E1)
- 타이포그래피: Geometric Sans-serif → Pretendard
- 무드: 미니멀리즘·모더니즘, 여백의 미 (앞면은 밝은 베이지+여백, 뒷면은 차콜 반전으로 대비)

## 결과물
- `front.html` / `back.html` — 1080×1350 고정 사이즈 카드 (팀 폴더 열어서 브라우저로 직접 확인 가능)
- `screenshots/front.png`, `screenshots/back.png` — 실제 픽셀 사이즈(1080×1350) PNG 렌더

## 렌더링 방법
Playwright MCP가 다른 세션에서 이미 점유 중이라(`Browser is already in use`), Chrome 헤드리스를 터미널에서 직접 호출해 스크린샷 생성:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1080,1350 \
  --screenshot="screenshots/front.png" \
  "file://$(pwd)/front.html"
```
`back.html`도 동일하게 반복.

## 제출 체크
- [x] 앞면 완성 (이름+한줄소개+좋아하는것+연락처)
- [x] 뒷면 완성 (포트폴리오 3종 + QR 자리 + SNS) → 양면 보너스 조건 충족
- [ ] 실제 제출은 GitHub 커밋 + 포인트 대시보드 등록 (본인 진행 필요)
