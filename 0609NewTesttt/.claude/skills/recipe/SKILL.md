---
name: recipe
description: This skill should be used when the user runs "/recipe" or asks to "레시피 추천", "레시피 생성", "냉장고 재료로 요리 추천", "recommend a recipe", or "generate a recipe from ingredients". It reads ingredient JSON files from a folder, generates one or more recipes from the available ingredients, and saves them as a Markdown file.
version: 1.0.0
---

# Recipe (레시피 추천/생성 스킬)

## Overview (개요)

이 스킬은 폴더에 있는 **재료별 JSON 파일들**을 읽어 그 재료로 만들 수 있는 **레시피를 추천/생성**하고, 결과를 **마크다운 파일로 저장**합니다.

전체 흐름:

```
[재료별 JSON 파일 작성] → [/recipe 실행] → [ingredients 폴더 전체 읽기]
   → [레시피 생성] → [마크다운 파일로 저장]
```

## Input (입력)

각 재료 JSON 파일은 다음 형태를 따른다고 가정합니다 (필드가 일부 없어도 동작):

```json
{
    "id": 1,
    "name": "대파",
    "category": "신선칸 (야채 및 과일)",
    "recommended_storage": "냉장 또는 냉동",
    "usage": "찌개, 볶음 등 모든 요리의 기본"
}
```

## Steps (실행 절차)

### 1. 재료 폴더 찾기

사용자가 폴더 경로를 인자로 줬다면 그 경로를 사용합니다 (예: `/recipe Week4/Homework4/01_refrigerator/ingredients_json`).

인자가 없으면 아래 순서로 현재 작업 디렉터리부터 재료 JSON 폴더를 탐색합니다:

```bash
# .json 파일이 들어있는 폴더 후보를 찾는다
find . -type d \( -name "ingredients" -o -name "ingredients_json" \) 2>/dev/null
# 못 찾으면 .json이 여러 개 있는 폴더를 직접 탐색
find . -name "*.json" -path "*ingredient*" 2>/dev/null | head -50
```

후보 폴더가 여러 개면 사용자에게 어느 폴더를 쓸지 물어봅니다. 하나도 없으면 경로를 알려달라고 요청합니다.

### 2. 모든 JSON 파일 읽기

선택한 폴더의 `*.json` 파일을 **전부** 읽어 재료 목록을 만듭니다. 각 파일에서 `name`, `category`, `usage`, `recommended_storage`를 추출합니다. JSON 파싱이 안 되는 파일은 건너뛰고 마지막에 몇 개를 건너뛰었는지 보고합니다.

빠르게 전체 내용을 모으려면:

```bash
# 폴더의 모든 JSON을 한 번에 합쳐서 살펴보기 (jq 있으면)
jq -s '[.[] | {name, category, usage}]' <폴더>/*.json 2>/dev/null
```

> 재료 수가 많으면(수십 개) 위 Bash로 한 번에 요약 데이터를 모은 뒤 그걸 근거로 레시피를 만드는 것이 효율적입니다.

### 3. 레시피 생성

읽어들인 재료를 바탕으로 **2~4개의 레시피**를 생성합니다. 각 레시피는 다음을 포함합니다:

- **요리 이름** (한글, 이모지 포함 가능)
- **사용 재료**: 반드시 폴더에서 읽은 재료 안에서만 고릅니다. 소금·후추·물·식용유 같은 기본 양념은 "기본 양념"으로 따로 표기해도 됩니다.
- **예상 조리 시간 / 난이도**
- **조리 단계** (번호 매긴 순서)
- **팁** (보관법 `recommended_storage`나 `usage`를 활용한 한 줄 팁)

원칙:
- 폴더에 **없는** 주재료를 지어내지 않습니다 (availability 우선).
- 사용자가 특정 조건(예: "10분 안에", "다이어트용", "한 가지만")을 말하면 그 조건을 우선합니다.

### 4. 마크다운 파일로 저장

생성한 레시피를 마크다운으로 저장합니다.

- 저장 위치: 재료 폴더의 **상위 폴더 아래** `recipes/` 폴더 (없으면 생성). 예: 재료가 `01_refrigerator/ingredients_json/`이면 `01_refrigerator/recipes/`에 저장.
- 파일명: `recipe_<요리수>품_<순번>.md` 또는 대표 요리명을 살린 이름 (예: `recipe_3dishes.md`). 날짜는 환경에서 확인 가능하면 `recipe_YYYY-MM-DD.md` 형식을 써도 됩니다.
- 기존 파일을 덮어쓰지 말고, 같은 이름이 있으면 뒤에 번호를 붙입니다.

### 5. 결과 보고

저장한 파일 경로, 생성한 레시피 개수, 사용한 재료 수, 건너뛴 파일이 있으면 그 수를 사용자에게 한국어로 간단히 보고합니다.

## Output Markdown Template (저장 마크다운 형식)

```markdown
# 🍳 오늘의 추천 레시피

> 재료 폴더: `<폴더 경로>` · 읽은 재료: N개 · 생성일: YYYY-MM-DD

## 1. <요리 이름>

- **조리 시간**: 약 N분 · **난이도**: ★★☆☆☆
- **사용 재료**: 대파, 달걀, 두부 ...
- **기본 양념**: 소금, 후추, 식용유

### 만드는 법
1. ...
2. ...
3. ...

💡 **팁**: ...

---

## 2. <요리 이름>
...
```

## Notes (주의)

- 파일을 읽기만 하고 원본 JSON은 수정하지 않습니다.
- 한글이 깨지지 않도록 UTF-8로 저장합니다.
- 재료가 너무 적으면(2개 미만) 레시피 대신 재료를 더 추가해 달라고 안내합니다.
