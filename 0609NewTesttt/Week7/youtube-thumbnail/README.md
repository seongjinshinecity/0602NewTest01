# YouTube 썸네일 만들기 (1920×1080) — 고블린 #14

노션 원본: https://ruucm.notion.site/YouTube-1920-1080-1c57eb4baa8c82b9b87f011f855c80b7

## 미션 요약
좋아하는 유튜버의 영상 한 편을 골라 어울리는 썸네일. 1920×1080(16:9) 고정, 주제가 한눈에 들어오는 굵직한 카피 + 강조색 + 인물/이미지 합성. 기본 15pt + A/B 비교 보너스 5pt(이번 제출은 단일 버전).

## 선택한 채널: "mf의 공간 탐구 生" (가상 채널)
실존 유튜버의 초상·영상을 그대로 쓰지 않기 위해, mf 캐릭터(취미: 트렌디한 공간 투어 — 성수동·한남동 팝업 스토어 방문)를 그대로 살려 **본인 세계관의 가상 브이로그 채널**로 설정.

- **영상 소재**: "성수동 팝업 일주일 10곳 다녀봄" — about-me2.md 취미 항목("트렌디한 공간 투어") 그대로 반영
- **굵직한 카피**: 큰 타이포 2줄 + 강조색(오렌지)으로 핵심 숫자("10곳") 강조
- **인물/이미지 합성 자리**: 실제 인물 사진 대신 우측에 공간·오브제를 암시하는 색 블록으로 대체(초상권 이슈 없는 가상 채널이므로 실사진 합성은 생략)
- **채널 배지**: mf 프로필 카드와 동일한 원형 로고마크 재사용

## 결과물
- `thumb.html` — 1920×1080 고정 사이즈
- `screenshots/thumb.png` — 실제 픽셀 렌더

## 렌더링 방법
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1920,1080 \
  --screenshot="screenshots/thumb.png" \
  "file://$(pwd)/thumb.html"
```
