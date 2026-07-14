# 인스타 광고 카드 만들기 (1080×1080) — 고블린 #13

노션 원본: https://ruucm.notion.site/1080-1080-0cb7eb4baa8c825993fc0147a29541f9

## 미션 요약
좋아하는 브랜드 하나를 골라 그 톤앤매너에 맞는 인스타그램 광고 카드. 1080×1080 고정, 브랜드 컬러/폰트/슬로건 일관성, 한 줄 카피+비주얼+CTA. 기본 15pt + 같은 톤 3장 캐러셀 보너스 5pt(이번 제출은 단일 컷).

## 선택한 브랜드: ATELIER GRAY (가상 브랜드)
실존 브랜드 로고·이미지를 그대로 쓰지 않기 위해, `profile-card-mf`에서 만든 "mf" 캐릭터의 취향(저채도 뉴트럴톤·미니멀리즘)을 그대로 이어받는 **가상의 미니멀 리빙 브랜드**를 설정해 광고 카드를 제작.

- **메인 카피**: "공간에, 여백을 놓다." (5단어, 브랜드 슬로건과 제품 컨셉을 압축)
- **비주얼**: 세라믹 화병 실루엣 + 그라데이션 배경 (사진 대신 CSS 도형으로 표현)
- **CTA**: "지금 둘러보기 →"
- **컬러**: Warm Gray → Sand Beige 그라데이션, mf 프로필 카드와 동일 팔레트로 일관성 유지

## 결과물
- `card.html` — 1080×1080 고정 사이즈
- `screenshots/card.png` — 실제 픽셀 렌더

## 렌더링 방법
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1080,1080 \
  --screenshot="screenshots/card.png" \
  "file://$(pwd)/card.html"
```
