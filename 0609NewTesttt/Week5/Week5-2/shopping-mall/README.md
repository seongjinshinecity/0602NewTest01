# 🛍️ QUARTER STORE — 쇼핑몰 (Auth + DB, 결제 제외)

상품 목록 → 장바구니 담기 → 수량 관리 → 합계. 결제는 일부러 제외("주문하기"는 준비 중). (5주차 배치1 — [Auth+DB] 퀘스트)

## 스택
- Express + `pg` → Supabase Postgres
- 인증: 공용 `shared/auth.js` (bcrypt + 세션 쿠키)
- 프론트: 단일 `public/index.html` (바닐라 JS, 상품 그리드 + 슬라이드 장바구니)

## 실행
```bash
cd Week5-2
npm install
cp .env.example .env        # DATABASE_URL 채우기
npm run shop                # → http://localhost:3002
```
첫 실행 시 **샘플 상품 10종**(카페 굿즈, Unsplash 이미지)이 자동 시드된다.

## 기능 (미션 매핑)
- **상품 목록** — DB 상품(상품명/가격/이미지/설명), 로그인 없이 공개
- **회원가입 & 로그인** — 장바구니는 로그인 필요
- **장바구니** — 담기 / 조회 / 수량 +,− / 삭제 / **총 금액 합계**

## API
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/products` | 공개 | 상품 목록 |
| GET | `/api/cart` | 로그인 | 내 장바구니 + 합계 |
| POST | `/api/cart` | 로그인 | 담기 `{product_id, quantity}` (있으면 +) |
| PATCH | `/api/cart/:productId` | 로그인 | 수량 변경 `{delta}` 또는 `{quantity}` (0 이하면 삭제) |
| DELETE | `/api/cart/:productId` | 로그인 | 항목 삭제 |

장바구니는 `user_id` 로 격리되어 **본인 것만** 조회·수정된다.

## 스크린샷
`screenshots/` 참고 (상품목록→담기→수량변경→합계).
