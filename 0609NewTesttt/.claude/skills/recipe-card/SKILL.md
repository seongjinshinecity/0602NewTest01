---
name: recipe-card
description: This skill should be used when the user wants a single dish written up as a self-contained "recipe card" folder — e.g. "<요리> 레시피 만들어줘 / md로 정리하고 썸네일도", "레시피 카드 만들어줘", "make a recipe card", "recipe md + thumbnail". For ONE named dish it creates a folder containing the recipe markdown, a README, and a thumbnail/ subfolder with an SVG-rendered PNG thumbnail (no API key needed). Use the `recipe` skill instead when generating recipes from ingredient JSON files.
version: 1.0.0
---

# Recipe Card (레시피 카드 스킬)

## Overview (개요)

사용자가 **요리 하나**를 지목하면, 그 요리를 **자기완결적인 폴더 한 묶음**으로 정리합니다:
레시피 마크다운 + README + `thumbnail/` 폴더(SVG 원본과 렌더된 PNG). 썸네일은 **SVG를 직접 그려 macOS `qlmanage`로 PNG 렌더링**하므로 API 키가 필요 없습니다.

생성 폴더 구조:

```
<slug>/
├── README.md          # 폴더 안내 + 미리보기 + 재생성 명령
├── <요리이름>.md       # 레시피 본문 (재료·조리법·꿀팁)
└── thumbnail/
    ├── thumbnail.png  # 렌더 결과 (800×800)
    └── thumbnail.svg  # 원본 (수정용)
```

## Steps (실행 절차)

### 1. 요리·출력 위치 정하기

- **요리 이름**: 인자나 대화에서 받습니다 (예: "김치볶음밥"). 없으면 어떤 요리인지 물어봅니다.
- **slug**: 영문 소문자-하이픈 폴더명 (예: `kimchi-fried-rice`). 적절한 영문명이 떠오르지 않으면 로마자 표기를 씁니다.
- **출력 폴더**: 현재 작업 디렉터리 기준. 사용자 메모리에 "특정 기간 생성물은 특정 폴더에" 규칙이 있으면 그 폴더(예: `Week5/`) 아래에 둡니다. 그 외에는 현재 폴더에 둡니다.

```bash
mkdir -p "<출력폴더>/<slug>/thumbnail"
```

### 2. 레시피 마크다운 작성

`<출력폴더>/<slug>/<요리이름>.md` 로 저장합니다. 아래 템플릿을 따릅니다(맨 위 썸네일 경로는 `thumbnail/thumbnail.png`):

```markdown
# <요리이름> 🍳

![<요리이름> 썸네일](thumbnail/thumbnail.png)

> <한 줄 소개>

**분량**: N인분 · **조리 시간**: 약 N분 · **난이도**: ⭐️☆☆☆☆

---

## 재료
| 재료 | 분량 | 비고 |
|------|------|------|
| ... | ... | ... |

---

## 만드는 법
1. ...
2. ...

---

## 💡 꿀팁
- ...
```

원칙: 분량·시간·난이도를 명시하고, 재료는 표로, 조리법은 번호 순서로. 한국어, UTF-8 저장.

### 3. 썸네일 SVG 그리기

`<출력폴더>/<slug>/thumbnail/thumbnail.svg` 에 **800×800 정사각형** SVG를 직접 작성합니다. 요리를 알아볼 수 있는 단순하고 식욕 도는 일러스트(그릇/접시 + 주재료 + 가니시 + 김/스팀 등) + 하단에 한글 요리명 텍스트. 구성 가이드:

- 따뜻한 그라데이션 배경(`<linearGradient>`/`<radialGradient>`)
- 그릇·접시는 타원/path, 주재료는 색 타원·원으로 표현
- 김(스팀)은 흰색 곡선 path + `opacity`
- 맨 아래 `<text ... font-weight="800">요리명</text>`

아래는 시작용 골격입니다(요리에 맞게 도형·색을 바꾸세요):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd7b0"/>
      <stop offset="1" stop-color="#ff9a6b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <!-- TODO: 그릇/접시 + 주재료 + 가니시 + 스팀 -->
  <text x="400" y="730" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="72"
        font-weight="800" fill="#3a2417">요리이름</text>
</svg>
```

### 4. PNG로 렌더링 (macOS qlmanage)

SVG를 PNG로 렌더링합니다. `qlmanage`는 `<파일명>.png` 형태로 내보내므로 이름을 정리합니다:

```bash
cd "<출력폴더>/<slug>"
qlmanage -t -s 800 -o thumbnail thumbnail/thumbnail.svg >/dev/null 2>&1
mv -f thumbnail/thumbnail.svg.png thumbnail/thumbnail.png
```

렌더 후 `thumbnail/thumbnail.png` 를 Read로 직접 확인해 모양이 의도대로 나왔는지 점검하고, 어색하면 SVG를 고쳐 다시 렌더링합니다.

> `qlmanage`가 없는(비-macOS) 환경이면: `rsvg-convert -w 800 -h 800 thumbnail/thumbnail.svg -o thumbnail/thumbnail.png` 또는 `magick thumbnail/thumbnail.svg thumbnail/thumbnail.png` 를 대신 사용합니다.

### 5. README 작성

`<출력폴더>/<slug>/README.md` 에 폴더 안내를 저장합니다: 미리보기 이미지(`thumbnail/thumbnail.png`), 폴더 트리, 썸네일 재생성 명령(4단계), 분량·시간·난이도·생성일.

### 6. 결과 보고

저장 폴더 경로, 만든 파일 목록(레시피 md / README / 썸네일), 썸네일 미리보기를 한국어로 간단히 보고합니다.

## Notes (주의)

- **자기완결적**: 썸네일은 SVG + `qlmanage`로만 만들며 외부 API/키가 필요 없습니다.
- 같은 이름의 폴더가 이미 있으면 덮어쓰지 말고 사용자에게 확인하거나 뒤에 번호를 붙입니다.
- 여러 요리를 한 번에 요청하면 요리마다 폴더를 따로 만듭니다.
- 재료 JSON 폴더에서 가용 재료 기반으로 추천하는 작업은 이 스킬이 아니라 `recipe` 스킬을 씁니다.
