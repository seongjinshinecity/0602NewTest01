# 🛍️ QUARTER STORE — 쇼핑몰 완성판 (이미지 + 결제 + 마이페이지)

6주차 **[Payment+File] 쇼핑몰 완성** 퀘스트 제출물.
5주차 [Auth+DB] 쇼핑몰에 ① ImageKit 이미지 업로드(관리자) ② 토스페이먼츠 결제 ③ 마이페이지 ④ Vercel 배포를 붙여 "진짜 서비스"로 완성했다.

## 🔗 배포 URL

**https://shopping-mall-complete.vercel.app**

- `/` — **QUARTER 카페 인트로** (ASCII 글리치 애니메이션, Week5 `01_Cafe/05_인트로` 재사용). ENTER STORE 버튼 / Enter 키로 입장, 배경 클릭 = 리플레이
- `/shop.html` — 쇼핑몰 본체

## 스택

- **백엔드**: Express + `pg` → Supabase Postgres (`mall_*` 테이블 네임스페이스)
- **인증**: bcrypt + HMAC 서명 세션 쿠키 (stateless)
- **결제**: 토스페이먼츠 결제위젯 v2 (문서용 테스트 키 — 실결제 없음, 자정 자동 취소)
- **이미지**: ImageKit REST 업로드 (Private Key 는 서버 전용)
- **배포**: Vercel (`api/index.js` 서버리스 + `public/` 정적) — 모든 키는 환경변수
- **프론트**: 바닐라 JS 멀티 페이지 (index=인트로 / shop / checkout / success / fail / mypage / admin)

## 미션 매핑

| Part | 요구사항 | 구현 |
|---|---|---|
| **1. File** | 관리자 이미지 업로드 → DB에 URL | `admin.html` → `POST /api/admin/products` (base64) → 서버가 ImageKit 업로드 → `image_url` 저장. 기존 상품 이미지 교체도 지원 |
| **2. Payment** | 장바구니 → 위젯 → 서버 승인 → 주문 저장 | `POST /api/checkout` 이 **서버 계산 금액**으로 PENDING 주문 생성 → 위젯 `requestPayment` → `success.html` → `POST /api/payments/confirm` 에서 **금액 대조 후** 토스 승인 API 호출 → PAID 전환 + 장바구니 비움. 중복 승인 방지(idempotent) |
| **3. 마이페이지** | 본인 주문만 조회 | `GET /api/orders` 가 `WHERE user_id = 로그인 유저` + `paid_at DESC`. 주문번호 앞 8자리 표시, 수량×단가·합계, 빈 상태 화면 |
| **4. 배포** | Vercel + 환경변수 | `DATABASE_URL` `SESSION_SECRET` `TOSS_SECRET_KEY` `IMAGEKIT_*` 전부 Vercel 환경변수 등록. 코드에 비밀 키 없음 |

## 보안 포인트 (퀘스트 학습 목표)

- **금액 위·변조 차단**: 결제 금액은 프론트가 아니라 서버가 장바구니로 계산해 PENDING 주문에 저장하고, 승인 직전 결제 금액과 대조한다
- **Secret Key 는 서버에서만**: 토스 시크릿 키·ImageKit Private Key 는 `.env`/Vercel 환경변수로만 존재, 프론트에는 절대 노출 안 됨 (`/api/config` 는 공개 가능한 클라이언트 키만 반환)
- **권한 제어**: 장바구니·주문은 `user_id` 필터로 본인 것만, 상품 등록·이미지 업로드는 관리자(`ADMIN_EMAILS` 또는 user id 1)만

## 실행 (로컬)

```bash
npm install
cp .env.example .env   # DATABASE_URL, 키들 채우기
npm start              # → http://localhost:3010
```

## 스크린샷 (`screenshots/`)

| 파일 | 내용 |
|---|---|
| `00-intro.png` | 카페 인트로 (QUARTER ASCII 글리치 + ENTER STORE) |
| `01-products.png` | 상품 목록 (배포 버전) |
| `03-payment-success.png` | ✅ 결제 완료 화면 (주문번호 f8ec437a · ₩200 테스트 결제) |
| `04-mypage-order.png` | 마이페이지 — 결제완료 주문 내역 (계좌이체 · ₩100×2) |
| `05-admin-imagekit.png` | 관리자 — ImageKit 연결됨 + 업로드된 상품(CDN 이미지) |

> 체크아웃 위젯 화면은 headless 캡처가 안 돼서 생략 — 배포 URL 에서 직접 확인 가능.
> 테스트 결제 검증: 위젯 → 테스트 결제창 → 승인 → DB `mall_orders.status='PAID'` + Network `/confirm` 200 확인 완료 (2026-07-08).

## API

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/products` | 공개 | 상품 목록 |
| GET/POST/PATCH/DELETE | `/api/cart...` | 로그인 | 장바구니 CRUD + 합계 |
| POST | `/api/checkout` | 로그인 | PENDING 주문 생성 (서버 금액 계산) |
| POST | `/api/payments/confirm` | 로그인 | 금액 검증 → 토스 승인 → PAID |
| GET | `/api/orders` | 로그인 | **본인** 주문 내역 (결제완료만) |
| POST | `/api/admin/products` | 관리자 | 상품 등록 (+ImageKit 업로드) |
| PATCH | `/api/admin/products/:id/image` | 관리자 | 상품 이미지 교체 |
