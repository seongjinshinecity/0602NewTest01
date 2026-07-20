# Nw7 — 카페 마케팅/메뉴 이미지 생성 (fal.ai)

여덟 시 반(가산디지털단지 카페)의 메뉴/마케팅 이미지를 fal.ai 이미지 생성 모델로 만드는 스크립트.

## 준비

1. `.env`에 fal.ai API 키 입력
   ```
   FAL_KEY=발급받은_키_id:secret
   ```
2. 의존성 설치
   ```
   pip install -r requirements.txt
   ```

## 사용법

프리셋으로 생성:
```
python generate_image.py --preset coffee-hero
python generate_image.py --preset dessert-box
python generate_image.py --preset instagram-post
python generate_image.py --preset menu-flatlay
```

자유 프롬프트로 생성:
```
python generate_image.py --prompt "설명하고 싶은 이미지 프롬프트" --count 2
```

생성된 이미지는 `output/` 폴더에 저장된다 (git에는 커밋 안 됨).

## 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `--prompt` | 자유 프롬프트 (--preset과 택1) | - |
| `--preset` | `coffee-hero` / `dessert-box` / `instagram-post` / `menu-flatlay` | - |
| `--model` | fal.ai 모델 엔드포인트 | `fal-ai/flux/dev` |
| `--count` | 생성 이미지 수 | 1 |
| `--output` | 출력 폴더 | `output` |
