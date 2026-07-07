# summer-cafe-menu

여름 시즌 카페 메뉴를 기획하고 실무 산출물 4종을 한 번에 생성하는 Claude Code skill.

## 산출물

| 파일 | 내용 |
|---|---|
| `menu.md` | 카테고리별 메뉴 목록 (이름·설명·가격) |
| `recipes.md` | 메뉴별 레시피 카드 (재료·분량·만드는 법·팁) |
| `menu-board.html` | 인쇄 가능한 디자인 메뉴판 (단일 HTML) |
| `cost-sheet.xlsx` | 원가표 (메뉴별 원가·원가율·마진 + 재료 상세) |

## 사용법

Claude Code에서 자연어로 요청하면 자동 발동된다.

**컨셉 모드** — 컨셉만 주면 메뉴를 처음부터 구성:
```
한강 근처 20대 타깃 카페야. '청량한 바다' 컨셉으로 여름 메뉴 8개 만들어줘
```

**기존 메뉴 모드** — 판매 중인 메뉴를 주면 어울리는 시즌 메뉴를 추가 제안:
```
지금 아메리카노 4500, 라떼 5000, 크루아상 4800 팔고 있어. 여름 시즌 메뉴 6개 추가해줘
```

## 구조

```
summer-cafe-menu/
├── SKILL.md                    # skill 본문 (메뉴 구성 원칙 + 산출물 스펙)
├── scripts/
│   └── make_cost_sheet.py      # 메뉴 JSON → 원가표 xlsx 생성 (openpyxl 필요)
├── README.md
└── command-input.txt           # 이 skill을 만들 때 쓴 프롬프트
```

## 요구사항

- Python 3 + openpyxl (`pip3 install openpyxl`)
