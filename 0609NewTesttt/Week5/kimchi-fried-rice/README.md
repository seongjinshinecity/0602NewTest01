# 김치볶음밥 레시피 카드 🍳

잘 익은 김치로 만드는 국민 한 그릇, 김치볶음밥 레시피 카드입니다.

## 미리보기

![김치볶음밥 썸네일](thumbnail/thumbnail.png)

## 폴더 구성

```
kimchi-fried-rice/
├── README.md          # 이 파일
├── 김치볶음밥.md       # 레시피 본문 (재료·조리법·꿀팁)
└── thumbnail/
    ├── thumbnail.png  # 800×800 썸네일 (렌더 결과)
    └── thumbnail.svg  # 썸네일 원본 (수정용)
```

## 사용법

- 레시피를 보려면 [`김치볶음밥.md`](김치볶음밥.md)를 여세요.
- 썸네일 디자인을 바꾸려면 `thumbnail/thumbnail.svg`를 수정한 뒤 아래 명령으로 다시 렌더링하세요.

```bash
qlmanage -t -s 800 -o thumbnail thumbnail/thumbnail.svg
mv -f thumbnail/thumbnail.svg.png thumbnail/thumbnail.png
```

## 정보

- **분량**: 1~2인분 · **조리 시간**: 약 15분 · **난이도**: ⭐️☆☆☆☆
- **생성일**: 2026-06-23
- **생성 도구**: `/recipe-card` 스킬 (SVG + macOS qlmanage 썸네일)
